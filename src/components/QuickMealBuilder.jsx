import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Sparkles, ChevronDown, ChevronUp, X, Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CATEGORIES = [
  { key: 'proteins', label: 'Proteins', emoji: '🥩' },
  { key: 'vegetables', label: 'Vegetables', emoji: '🥦' },
  { key: 'grains_starches', label: 'Grains & Starches', emoji: '🌾' },
  { key: 'fruits', label: 'Fruits', emoji: '🍎' },
  { key: 'dairy', label: 'Dairy', emoji: '🥛' },
  { key: 'healthy_fats', label: 'Healthy Fats', emoji: '🥑' },
  { key: 'snacks', label: 'Snacks', emoji: '🍿' },
];

const EMPTY_NUTRITION = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 };

function NutritionBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
        <span>{label}</span>
        <span className="font-semibold">{Math.round(value)}{label === 'Calories' ? '' : 'g'}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const DEFAULT_CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map(c => [c.key, { label: c.label, emoji: c.emoji }])
);

function loadCategoryLabels() {
  try {
    const saved = localStorage.getItem('mealBuilderCategoryLabels');
    return saved ? { ...DEFAULT_CATEGORY_LABELS, ...JSON.parse(saved) } : { ...DEFAULT_CATEGORY_LABELS };
  } catch {
    return { ...DEFAULT_CATEGORY_LABELS };
  }
}

// Load custom (user-added) categories from localStorage
function loadCustomCategories() {
  try {
    const saved = localStorage.getItem('mealBuilderCustomCategories');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function QuickMealBuilder() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({ proteins: true });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingCategory, setAddingCategory] = useState('proteins');
  const [newFood, setNewFood] = useState({ name: '', estimated_serving_size: '', category: 'proteins' });
  const [calculatingNutrition, setCalculatingNutrition] = useState(false);
  const [showTotals, setShowTotals] = useState(true);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState({ mealName: '', day: '', mealType: '', memberIds: [], saveToMeals: false });
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [categoryLabels, setCategoryLabels] = useState(loadCategoryLabels);
  const [customCategories, setCustomCategories] = useState(loadCustomCategories);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameForm, setRenameForm] = useState({});
  const [deletedKeys, setDeletedKeys] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [assigningEmojis, setAssigningEmojis] = useState(false);
  // Ref-based dialog custom categories to avoid stale closures entirely
  const dialogCustomCategoriesRef = useRef([]);
  const [dialogCustomCategories, setDialogCustomCategories] = useState([]);

  const { data: goToFoods = [] } = useQuery({
    queryKey: ['goToFoods'],
    queryFn: () => base44.entities.GoToFood.list(),
  });

  const createFoodMutation = useMutation({
    mutationFn: (data) => base44.entities.GoToFood.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goToFoods']);
      setShowAddDialog(false);
      setNewFood({ name: '', estimated_serving_size: '', category: 'proteins' });
    },
  });

  const deleteFoodMutation = useMutation({
    mutationFn: (id) => base44.entities.GoToFood.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['goToFoods']),
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
    staleTime: 10 * 60 * 1000,
  });

  const handleAddToPlan = async () => {
    if (!planForm.mealName.trim() || !planForm.day || !planForm.mealType) return;
    setAddingToPlan(true);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    let mealId = null;
    if (planForm.saveToMeals) {
      const meal = await base44.entities.Meal.create({
        name: planForm.mealName.trim(),
        type: planForm.mealType,
        kid_friendly: true,
        ingredients: selectedItems.map(i => i.name),
        nutrition: totals,
      });
      mealId = meal.id;
      queryClient.invalidateQueries(['meals']);
    }

    await base44.entities.MealPlan.create({
      week_start_date: weekStartStr,
      day_of_week: planForm.day,
      meal_type: planForm.mealType,
      meal_id: mealId || '',
      meal_name: planForm.mealName.trim(),
      assigned_to_member_ids: planForm.memberIds,
    });
    queryClient.invalidateQueries(['mealPlans']);
    setAddingToPlan(false);
    setShowPlanDialog(false);
    setPlanForm({ mealName: '', day: '', mealType: '', memberIds: [], saveToMeals: false });
  };



  const handleAddFood = async () => {
    if (!newFood.name.trim()) return;
    setCalculatingNutrition(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `For the food item "${newFood.name}", provide a standard healthy serving size and its nutrition facts per that serving. If a serving size is already provided ("${newFood.estimated_serving_size}"), use that, otherwise determine the most common/standard serving size.`,
      response_json_schema: {
        type: 'object',
        properties: {
          estimated_serving_size: { type: 'string', description: 'e.g. "1 cup", "3 oz", "1 medium"' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          fiber_g: { type: 'number' },
          sugar_g: { type: 'number' },
        },
      },
    });
    setCalculatingNutrition(false);
    const { estimated_serving_size, ...nutritionFields } = result;
    createFoodMutation.mutate({
      ...newFood,
      estimated_serving_size: newFood.estimated_serving_size || estimated_serving_size,
      nutrition: nutritionFields,
    });
  };

  const toggleItem = (food) => {
    setSelectedItems(prev =>
      prev.find(i => i.id === food.id)
        ? prev.filter(i => i.id !== food.id)
        : [...prev, food]
    );
  };

  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openAddDialog = (categoryKey) => {
    setAddingCategory(categoryKey);
    setNewFood({ name: '', estimated_serving_size: '', category: categoryKey });
    setShowAddDialog(true);
  };

  const openRenameDialog = () => {
    dialogCustomCategoriesRef.current = [...customCategories];
    setDialogCustomCategories([...customCategories]);
    setRenameForm(Object.fromEntries(
      allCategories.map(c => [c.key, categoryLabels[c.key]?.label || c.label])
    ));
    setDeletedKeys([]);
    setNewCatName('');
    setShowRenameDialog(true);
  };

  const handleAddNewCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const key = 'custom_' + Date.now();
    const newCat = { key, label: name, emoji: '🍽️' };
    dialogCustomCategoriesRef.current = [...dialogCustomCategoriesRef.current, newCat];
    setDialogCustomCategories(dialogCustomCategoriesRef.current);
    setRenameForm(prev => ({ ...prev, [key]: name }));
    setNewCatName('');
  };

  const handleSaveRenames = async () => {
    // Build surviving categories (not deleted) — use dialogCustomCategories to avoid stale closure
    const survivingBuiltIn = CATEGORIES.filter(c => !deletedKeys.includes(c.key));
    const survivingCustom = dialogCustomCategoriesRef.current.filter(c => !deletedKeys.includes(c.key));
    const allSurviving = [...survivingBuiltIn, ...survivingCustom];

    setAssigningEmojis(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `For each of these food category names, pick the single most fitting food emoji. Return a JSON object mapping each key to its emoji.\n\nCategories:\n${allSurviving.map(c => `${c.key}: "${renameForm[c.key] || c.label}"`).join('\n')}`,
      response_json_schema: {
        type: 'object',
        properties: Object.fromEntries(allSurviving.map(c => [c.key, { type: 'string' }])),
      },
    });
    setAssigningEmojis(false);

    const updated = Object.fromEntries(
      allSurviving.map(c => [c.key, {
        label: renameForm[c.key] || c.label,
        emoji: result[c.key] || categoryLabels[c.key]?.emoji || c.emoji,
      }])
    );
    setCategoryLabels(updated);
    localStorage.setItem('mealBuilderCategoryLabels', JSON.stringify(updated));

    const newCustom = survivingCustom;
    setCustomCategories(newCustom);
    localStorage.setItem('mealBuilderCustomCategories', JSON.stringify(newCustom));

    setShowRenameDialog(false);
  };

  const allCategories = [...CATEGORIES, ...customCategories];

  const totals = selectedItems.reduce((acc, food) => {
    const n = food.nutrition || EMPTY_NUTRITION;
    return {
      calories: acc.calories + (n.calories || 0),
      protein_g: acc.protein_g + (n.protein_g || 0),
      carbs_g: acc.carbs_g + (n.carbs_g || 0),
      fat_g: acc.fat_g + (n.fat_g || 0),
      fiber_g: acc.fiber_g + (n.fiber_g || 0),
      sugar_g: acc.sugar_g + (n.sugar_g || 0),
    };
  }, { ...EMPTY_NUTRITION });

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">Quick Meal Builder</h2>
        <div className="flex items-center gap-1.5 ml-2">
          <p className="text-xs text-gray-500 whitespace-nowrap">Tap items to build a meal</p>
          <button onClick={openRenameDialog} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meal summary — sticky at top, above categories */}
      {selectedItems.length > 0 && (
        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 shadow-sm sticky top-0 z-20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap flex-shrink-0 mr-1">
                <span className="text-sm font-bold text-pink-600">{Math.round(totals.calories)}</span>
                <span className="text-xs text-gray-500 ml-0.5">cal</span>
              </span>
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white text-xs"
                onClick={() => setShowPlanDialog(true)}
              >
                Add to Plan
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="border-pink-200 text-pink-600 hover:bg-pink-100 text-xs">
                    Nutrients
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="end">
                  <h4 className="font-semibold text-gray-900 mb-3">Nutrition Facts</h4>
                  <div className="space-y-3">
                    <NutritionBar label="Protein" value={totals.protein_g} max={150} color="bg-blue-500" />
                    <NutritionBar label="Carbs" value={totals.carbs_g} max={300} color="bg-yellow-500" />
                    <NutritionBar label="Fat" value={totals.fat_g} max={100} color="bg-orange-500" />
                    <NutritionBar label="Fiber" value={totals.fiber_g} max={38} color="bg-green-500" />
                    <NutritionBar label="Sugar" value={totals.sugar_g} max={50} color="bg-red-400" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-gray-100 text-center">
                    <div>
                      <div className="text-base font-bold text-gray-900">{Math.round(totals.protein_g)}g</div>
                      <div className="text-xs text-gray-500">Protein</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-900">{Math.round(totals.carbs_g)}g</div>
                      <div className="text-xs text-gray-500">Carbs</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-900">{Math.round(totals.fat_g)}g</div>
                      <div className="text-xs text-gray-500">Fat</div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                className="border-pink-200 text-pink-600 hover:bg-pink-100 text-xs"
                onClick={() => setSelectedItems([])}
              >
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-xs text-gray-500 font-medium w-full mb-0.5">{selectedItems.length} items</span>
              {selectedItems.map(item => (
                <span key={item.id} className="bg-white text-gray-700 text-xs px-2 py-0.5 rounded-full border border-pink-200">
                  {item.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category sections */}
      {allCategories.map(cat => {
        const foods = goToFoods.filter(f => f.category === cat.key);
        const isExpanded = expandedCategories[cat.key];
        const selectedInCat = selectedItems.filter(i => i.category === cat.key);
        const catLabel = categoryLabels[cat.key]?.label || cat.label;
        const catEmoji = categoryLabels[cat.key]?.emoji || cat.emoji;

        return (
          <Card key={cat.key} className="bg-white border-0 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              onClick={() => toggleCategory(cat.key)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{catEmoji}</span>
                <span className="font-medium text-gray-900">{catLabel}</span>
                {selectedInCat.length > 0 && (
                  <span className="bg-pink-100 text-pink-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {selectedInCat.length} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); openAddDialog(cat.key); }}
                  className="text-pink-500 hover:text-pink-700 p-1 rounded-full hover:bg-pink-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {isExpanded && (
              <CardContent className="px-4 pb-4 pt-0">
                {foods.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3">
                    No items yet — tap <strong>+</strong> to add your go-to {catLabel.toLowerCase()}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {foods.map(food => {
                      const isSelected = !!selectedItems.find(i => i.id === food.id);
                      return (
                        <div key={food.id} className="flex items-center gap-1">
                          <button
                            onClick={() => toggleItem(food)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                              isSelected
                                ? 'bg-pink-600 text-white border-pink-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                            }`}
                          >
                            {food.name}
                            {food.estimated_serving_size && (
                              <span className={`ml-1 text-xs ${isSelected ? 'text-pink-200' : 'text-gray-400'}`}>
                                {food.estimated_serving_size}
                              </span>
                            )}
                            {food.nutrition?.calories ? (
                              <span className={`ml-1 text-xs ${isSelected ? 'text-pink-200' : 'text-gray-400'}`}>
                                · {food.nutrition.calories} cal
                              </span>
                            ) : null}
                          </button>
                          <button
                            onClick={() => deleteFoodMutation.mutate(food.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Add to Plan dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to Weekly Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Meal Name</label>
              <Input
                placeholder="e.g. Healthy Lunch Bowl"
                value={planForm.mealName}
                onChange={(e) => setPlanForm(p => ({ ...p, mealName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Day of Week</label>
              <select
                value={planForm.day}
                onChange={(e) => setPlanForm(p => ({ ...p, day: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                <option value="">Select day</option>
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Meal Type</label>
              <select
                value={planForm.mealType}
                onChange={(e) => setPlanForm(p => ({ ...p, mealType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                <option value="">Select type</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Assign to Family Members</label>
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                {familyMembers.length > 0 ? familyMembers.map(member => (
                  <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.memberIds.includes(member.id)}
                      onChange={(e) => setPlanForm(p => ({
                        ...p,
                        memberIds: e.target.checked
                          ? [...p.memberIds, member.id]
                          : p.memberIds.filter(id => id !== member.id)
                      }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">{member.name}</span>
                  </label>
                )) : <p className="text-xs text-gray-500">No family members found</p>}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.saveToMeals}
                onChange={(e) => setPlanForm(p => ({ ...p, saveToMeals: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Also save to Meals list</span>
            </label>
            <Button
              onClick={handleAddToPlan}
              disabled={!planForm.mealName.trim() || !planForm.day || !planForm.mealType || addingToPlan}
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
            >
              {addingToPlan ? 'Adding...' : 'Add to Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage categories dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Rename, add, or delete categories. AI will auto-assign emojis on save.</p>

            {/* Existing categories */}
            {[...CATEGORIES, ...dialogCustomCategories].map(c => {
              const isDeleted = deletedKeys.includes(c.key);
              return (
                <div key={c.key} className={`flex items-center gap-2 transition-opacity ${isDeleted ? 'opacity-40' : ''}`}>
                  <span className="text-lg w-7 text-center flex-shrink-0">{categoryLabels[c.key]?.emoji || c.emoji}</span>
                  <Input
                    value={renameForm[c.key] ?? categoryLabels[c.key]?.label ?? c.label}
                    onChange={(e) => setRenameForm(p => ({ ...p, [c.key]: e.target.value }))}
                    className="flex-1"
                    disabled={isDeleted}
                  />
                  <button
                    onClick={() => setDeletedKeys(prev =>
                      isDeleted ? prev.filter(k => k !== c.key) : [...prev, c.key]
                    )}
                    className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
                      isDeleted
                        ? 'text-green-500 hover:bg-green-50'
                        : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
                    }`}
                    title={isDeleted ? 'Restore' : 'Delete'}
                  >
                    {isDeleted ? <Plus className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}

            {/* Add new category */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <span className="text-lg w-7 text-center flex-shrink-0">🍽️</span>
              <Input
                placeholder="New category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                className="flex-1"
              />
              <button
                onClick={handleAddNewCategory}
                disabled={!newCatName.trim()}
                className="p-1.5 rounded-full text-pink-500 hover:text-pink-700 hover:bg-pink-50 transition-colors disabled:opacity-30 flex-shrink-0"
                title="Add category"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <Button
              onClick={handleSaveRenames}
              disabled={assigningEmojis}
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {assigningEmojis ? 'Assigning emojis...' : 'Save & Auto-assign Emojis'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add food dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Add to {categoryLabels[addingCategory]?.label || CATEGORIES.find(c => c.key === addingCategory)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Food name (e.g. Grilled Chicken Breast)"
              value={newFood.name}
              onChange={(e) => setNewFood(p => ({ ...p, name: e.target.value }))}
            />
            <Input
              placeholder="Serving size (optional — AI will determine if blank)"
              value={newFood.estimated_serving_size}
              onChange={(e) => setNewFood(p => ({ ...p, estimated_serving_size: e.target.value }))}
            />
            <p className="text-xs text-gray-500">
              Serving size and nutrition facts will be auto-calculated with AI.
            </p>
            <Button
              onClick={handleAddFood}
              disabled={!newFood.name.trim() || calculatingNutrition || createFoodMutation.isPending}
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {calculatingNutrition ? 'Calculating nutrition...' : createFoodMutation.isPending ? 'Saving...' : 'Add Food'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
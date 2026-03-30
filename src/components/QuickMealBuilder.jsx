import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Sparkles, ChevronDown, ChevronUp, X } from 'lucide-react';

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

export default function QuickMealBuilder() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({ proteins: true });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingCategory, setAddingCategory] = useState('proteins');
  const [newFood, setNewFood] = useState({ name: '', estimated_serving_size: '', category: 'proteins' });
  const [calculatingNutrition, setCalculatingNutrition] = useState(false);
  const [showTotals, setShowTotals] = useState(false);

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Quick Meal Builder</h2>
        <p className="text-sm text-gray-500">Tap items to build a meal</p>
      </div>

      {/* Category sections */}
      {CATEGORIES.map(cat => {
        const foods = goToFoods.filter(f => f.category === cat.key);
        const isExpanded = expandedCategories[cat.key];
        const selectedInCat = selectedItems.filter(i => i.category === cat.key);

        return (
          <Card key={cat.key} className="bg-white border-0 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              onClick={() => toggleCategory(cat.key)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{cat.emoji}</span>
                <span className="font-medium text-gray-900">{cat.label}</span>
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
                    No items yet — tap <strong>+</strong> to add your go-to {cat.label.toLowerCase()}
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

      {/* Meal summary — sticky at top */}
      {selectedItems.length > 0 && (
        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 shadow-sm sticky top-0 z-20">
          <CardContent className="p-4">
            <button
              className="flex items-center justify-between w-full mb-3"
              onClick={() => setShowTotals(p => !p)}
            >
              <div>
                <h3 className="font-semibold text-gray-900">Your Meal ({selectedItems.length} items)</h3>
                <p className="text-2xl font-bold text-pink-600">
                  {Math.round(totals.calories)} <span className="text-base font-normal text-gray-500">calories</span>
                </p>
              </div>
              {showTotals ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            <div className="flex flex-wrap gap-1 mb-3">
              {selectedItems.map(item => (
                <span key={item.id} className="bg-white text-gray-700 text-xs px-2 py-1 rounded-full border border-pink-200">
                  {item.name}
                </span>
              ))}
            </div>

            {showTotals && (
              <div className="space-y-3 mb-4">
                <NutritionBar label="Protein" value={totals.protein_g} max={60} color="bg-blue-500" />
                <NutritionBar label="Carbs" value={totals.carbs_g} max={100} color="bg-yellow-500" />
                <NutritionBar label="Fat" value={totals.fat_g} max={50} color="bg-orange-500" />
                <NutritionBar label="Fiber" value={totals.fiber_g} max={15} color="bg-green-500" />
                <NutritionBar label="Sugar" value={totals.sugar_g} max={25} color="bg-red-400" />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full border-pink-200 text-pink-600 hover:bg-pink-100"
              onClick={() => setSelectedItems([])}
            >
              Clear Selection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add food dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Add to {CATEGORIES.find(c => c.key === addingCategory)?.label}
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
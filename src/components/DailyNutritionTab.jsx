import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Sparkles, Save, RotateCcw, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export default function DailyNutritionTab() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('dailyNutritionItems');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newFood, setNewFood] = useState('');
  const [newServings, setNewServings] = useState(1);
  const [calculatingFor, setCalculatingFor] = useState(null);
  const [calculatingAll, setCalculatingAll] = useState(false);
  const [totals, setTotals] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDate, setSaveDate] = useState('');
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [expandedTotals, setExpandedTotals] = useState(true);

  // Persist items to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('dailyNutritionItems', JSON.stringify(items));
  }, [items]);

  const { data: savedPlans = [] } = useQuery({
    queryKey: ['dailyNutritionPlans'],
    queryFn: () => base44.entities.DailyNutritionPlan.list('-created_date', 20),
    staleTime: 2 * 60 * 1000,
  });

  const savePlanMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyNutritionPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['dailyNutritionPlans']);
      setShowSaveDialog(false);
      setSaveName('');
      setSaveDate('');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyNutritionPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['dailyNutritionPlans']),
  });

  const addItem = () => {
    if (!newFood.trim()) return;
    const id = `item_${Date.now()}`;
    setItems(prev => [...prev, {
      id,
      food_name: newFood.trim(),
      servings: newServings,
      nutrition_per_serving: null,
    }]);
    setNewFood('');
    setNewServings(1);
    setTotals(null);
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setTotals(null);
  };

  const updateServings = (id, servings) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, servings } : i));
    setTotals(null);
  };

  const fetchNutritionForItem = async (item) => {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Estimate the nutrition facts per 1 serving for: "${item.food_name}". Use common serving sizes (e.g., 1 medium apple, 1 cup, 1 oz, etc.). Return per-serving values.`,
      response_json_schema: {
        type: 'object',
        properties: {
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          fiber_g: { type: 'number' },
          sugar_g: { type: 'number' },
        },
      },
    });
    return result;
  };

  const calculateAll = async () => {
    setCalculatingAll(true);
    setTotals(null);

    const updated = [...items];
    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].nutrition_per_serving) {
        setCalculatingFor(updated[i].id);
        const nutrition = await fetchNutritionForItem(updated[i]);
        updated[i] = { ...updated[i], nutrition_per_serving: nutrition };
      }
    }
    setCalculatingFor(null);
    setItems(updated);

    // Sum totals
    const sum = { ...EMPTY_NUTRITION };
    for (const item of updated) {
      const n = item.nutrition_per_serving;
      if (!n) continue;
      const s = item.servings || 1;
      sum.calories += (n.calories || 0) * s;
      sum.protein_g += (n.protein_g || 0) * s;
      sum.carbs_g += (n.carbs_g || 0) * s;
      sum.fat_g += (n.fat_g || 0) * s;
      sum.fiber_g += (n.fiber_g || 0) * s;
      sum.sugar_g += (n.sugar_g || 0) * s;
    }
    setTotals(sum);
    setCalculatingAll(false);
  };

  const loadPlan = (plan) => {
    setItems((plan.items || []).map(i => ({ ...i, id: `item_${Date.now()}_${Math.random()}` })));
    setTotals(plan.total_nutrition || null);
    setLoadDialogOpen(false);
  };

  const handleSave = () => {
    savePlanMutation.mutate({
      name: saveName || `Plan ${new Date().toLocaleDateString()}`,
      date: saveDate || null,
      items,
      total_nutrition: totals,
    });
  };

  const recomputeTotals = (itemsList) => {
    const sum = { ...EMPTY_NUTRITION };
    for (const item of itemsList) {
      const n = item.nutrition_per_serving;
      if (!n) continue;
      const s = item.servings || 1;
      sum.calories += (n.calories || 0) * s;
      sum.protein_g += (n.protein_g || 0) * s;
      sum.carbs_g += (n.carbs_g || 0) * s;
      sum.fat_g += (n.fat_g || 0) * s;
      sum.fiber_g += (n.fiber_g || 0) * s;
      sum.sugar_g += (n.sugar_g || 0) * s;
    }
    return sum;
  };

  React.useEffect(() => {
    if (items.some(i => i.nutrition_per_serving)) {
      setTotals(recomputeTotals(items));
    }
  }, [items.map(i => `${i.id}_${i.servings}`).join(',')]);

  const hasAllNutrition = items.length > 0 && items.every(i => i.nutrition_per_serving);
  const hasSomeNutrition = items.some(i => i.nutrition_per_serving);

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Daily Nutrition Planner</h2>
        <div className="flex gap-2">
          {savedPlans.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-pink-200 text-pink-600 hover:bg-pink-50 text-xs"
              onClick={() => setLoadDialogOpen(true)}
            >
              Load Plan
            </Button>
          )}
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-pink-200 text-pink-600 hover:bg-pink-50 text-xs"
              onClick={() => {
                setItems([]);
                setTotals(null);
                localStorage.removeItem('dailyNutritionItems');
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Add food item */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add a food item</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. banana, chicken breast, 1 cup oatmeal..."
              value={newFood}
              onChange={(e) => setNewFood(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="flex-1"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">× servings</span>
              <Input
                type="number"
                min="0.25"
                step="0.25"
                value={newServings}
                onChange={(e) => setNewServings(parseFloat(e.target.value) || 1)}
                className="w-16 text-center"
              />
            </div>
            <Button
              onClick={addItem}
              disabled={!newFood.trim()}
              className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white flex-shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Item list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            const isCalc = calculatingFor === item.id;
            const n = item.nutrition_per_serving;
            const totalCal = n ? Math.round((n.calories || 0) * item.servings) : null;
            return (
              <Card key={item.id} className="bg-white border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{item.food_name}</div>
                      {n && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {totalCal} cal · {Math.round((n.protein_g || 0) * item.servings)}g protein · {Math.round((n.carbs_g || 0) * item.servings)}g carbs · {Math.round((n.fat_g || 0) * item.servings)}g fat
                        </div>
                      )}
                      {isCalc && <div className="text-xs text-pink-500 mt-0.5 animate-pulse">Calculating nutrition...</div>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-sm"
                        onClick={() => updateServings(item.id, Math.max(0.25, item.servings - 0.25))}
                      >−</button>
                      <span className="w-8 text-center text-sm font-medium">{item.servings}</span>
                      <button
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-sm"
                        onClick={() => updateServings(item.id, item.servings + 0.25)}
                      >+</button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Calculate button */}
      {items.length > 0 && (
        <Button
          onClick={calculateAll}
          disabled={calculatingAll || hasAllNutrition}
          className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {calculatingAll ? 'Calculating with AI...' : hasAllNutrition ? 'Nutrition Calculated ✓' : 'Calculate Daily Nutrition with AI'}
        </Button>
      )}

      {/* Totals summary */}
      {totals && (
        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 shadow-sm">
          <CardContent className="p-4">
            <button
              className="flex items-center justify-between w-full mb-3"
              onClick={() => setExpandedTotals(p => !p)}
            >
              <div>
                <h3 className="font-semibold text-gray-900">Daily Total</h3>
                <p className="text-2xl font-bold text-pink-600">{Math.round(totals.calories)} <span className="text-base font-normal text-gray-500">calories</span></p>
              </div>
              {expandedTotals ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {expandedTotals && (
              <div className="space-y-3">
                <NutritionBar label="Protein" value={totals.protein_g} max={150} color="bg-blue-500" />
                <NutritionBar label="Carbs" value={totals.carbs_g} max={300} color="bg-yellow-500" />
                <NutritionBar label="Fat" value={totals.fat_g} max={100} color="bg-orange-500" />
                <NutritionBar label="Fiber" value={totals.fiber_g} max={38} color="bg-green-500" />
                <NutritionBar label="Sugar" value={totals.sugar_g} max={50} color="bg-red-400" />
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-4 border-pink-200 text-pink-600 hover:bg-pink-100"
              onClick={() => setShowSaveDialog(true)}
            >
              <Save className="w-4 h-4 mr-2" /> Save This Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Add foods above, then hit <strong>Calculate Daily Nutrition</strong> to get an AI-powered breakdown.</p>
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Plan name (e.g. Healthy Monday)"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Assign to a date (optional)</label>
              <Input
                type="date"
                value={saveDate}
                onChange={(e) => setSaveDate(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={savePlanMutation.isPending}
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
            >
              {savePlanMutation.isPending ? 'Saving...' : 'Save Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load a Saved Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {savedPlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-pink-50 hover:bg-pink-100 transition-colors">
                <button className="flex-1 text-left" onClick={() => loadPlan(plan)}>
                  <div className="font-medium text-sm text-gray-900">{plan.name || 'Unnamed Plan'}</div>
                  {plan.date && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(plan.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                  {plan.total_nutrition && (
                    <div className="text-xs text-pink-600 mt-0.5">{Math.round(plan.total_nutrition.calories)} cal</div>
                  )}
                </button>
                <button onClick={() => deletePlanMutation.mutate(plan.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-2 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
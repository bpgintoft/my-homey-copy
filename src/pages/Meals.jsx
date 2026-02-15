import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ChefHat, ShoppingCart, Calendar, Clock, Users, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Meals() {
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [newMeal, setNewMeal] = useState({});
  const [selectedMealForPlan, setSelectedMealForPlan] = useState(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [planSelection, setPlanSelection] = useState({ day: '', mealType: '' });
  const [expandedMealId, setExpandedMealId] = useState(null);
  const queryClient = useQueryClient();

  const { data: meals = [] } = useQuery({
    queryKey: ['meals'],
    queryFn: () => base44.entities.Meal.list(),
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => base44.entities.MealPlan.list(),
  });

  const { data: groceries = [] } = useQuery({
    queryKey: ['groceries'],
    queryFn: () => base44.entities.GroceryItem.list(),
  });

  const staples = [
    'salt', 'pepper', 'butter', 'oil', 'olive oil', 'vegetable oil', 'garlic', 'onion',
    'water', 'milk', 'sugar', 'flour', 'eggs', 'baking powder', 'baking soda', 'vanilla extract',
    'cinnamon', 'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'rosemary', 'parsley',
    'honey', 'soy sauce', 'vinegar', 'lemon juice', 'lime juice', 'worcestershire sauce',
    'hot sauce', 'mayonnaise', 'ketchup', 'mustard', 'cornstarch'
  ];

  const filterStaples = (ingredients) => {
    return ingredients.filter(ingredient => {
      const lower = ingredient.toLowerCase();
      return !staples.some(staple => lower.includes(staple));
    });
  };

  const createMealMutation = useMutation({
    mutationFn: (data) => base44.entities.Meal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['meals']);
      setShowMealDialog(false);
      setNewMeal({});
    },
  });

  const addToGroceryListMutation = useMutation({
        mutationFn: async (meal) => {
          const filteredIngredients = filterStaples(meal.ingredients || []);
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());

          for (const ingredient of filteredIngredients) {
            const existing = groceries.find(g => g.name.toLowerCase() === ingredient.toLowerCase());
            if (existing) {
              const qty = parseInt(existing.quantity) || 1;
              await base44.entities.GroceryItem.update(existing.id, { quantity: (qty + 1).toString() });
            } else {
              await base44.entities.GroceryItem.create({
                name: ingredient,
                category: 'other',
                quantity: '1',
                purchased: false,
                week_start_date: weekStart.toISOString().split('T')[0],
              });
            }
          }
        },
        onSuccess: () => {
          queryClient.invalidateQueries(['groceries']);
        },
      });

  const addToMealPlanMutation = useMutation({
    mutationFn: async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      await base44.entities.MealPlan.create({
        week_start_date: weekStart.toISOString().split('T')[0],
        day_of_week: planSelection.day,
        meal_type: planSelection.mealType,
        meal_id: selectedMealForPlan.id,
        meal_name: selectedMealForPlan.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlans']);
      setPlanDialog(false);
      setSelectedMealForPlan(null);
      setPlanSelection({ day: '', mealType: '' });
    },
  });

  const deleteFromMealPlanMutation = useMutation({
    mutationFn: (mealPlanId) => base44.entities.MealPlan.delete(mealPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlans']);
    },
  });

  const updateGroceryQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => base44.entities.GroceryItem.update(id, { quantity: quantity.toString() }),
    onSuccess: () => {
      queryClient.invalidateQueries(['groceries']);
    },
  });

  const deleteGroceryItemMutation = useMutation({
    mutationFn: (id) => base44.entities.GroceryItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['groceries']);
    },
  });

  const generateMealPlanMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a weekly meal plan for a family with a 4-year-old and 9-year-old. Generate 7 days of kid-friendly dinners. Return as JSON array with: name, ingredients (array), instructions, prep_time, cook_time, kid_friendly: true, age_range: "4-9 years", type: "dinner"`,
        response_json_schema: {
          type: "object",
          properties: {
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  ingredients: { type: "array", items: { type: "string" } },
                  instructions: { type: "string" },
                  prep_time: { type: "number" },
                  cook_time: { type: "number" },
                  kid_friendly: { type: "boolean" },
                  age_range: { type: "string" },
                  type: { type: "string" }
                }
              }
            }
          }
        }
      });
      return result.meals;
    },
    onSuccess: async (generatedMeals) => {
      for (const meal of generatedMeals) {
        await base44.entities.Meal.create(meal);
      }
      queryClient.invalidateQueries(['meals']);
    },
  });

  const kidFriendlyMeals = meals.filter(m => m.kid_friendly);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="relative overflow-hidden">
        <style>{`
          .meal-banner-bg {
            background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%);
            background-size: 400% 400%;
          }
        `}</style>
        <div className="relative h-40 md:h-48 meal-banner-bg flex items-center justify-between px-4 md:px-12 gap-0">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-1 md:mb-2">
              Meal Planning
            </h1>
            <p className="text-sm md:text-lg text-gray-700">
              Kid-friendly meals for the whole family
            </p>
          </div>
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/9d880a561_familycooking.png" 
            alt="Family Cooking"
            className="h-40 md:h-56 w-auto object-cover flex-shrink-0"
          />
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="meals" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="meals">Meal Ideas</TabsTrigger>
            <TabsTrigger value="plan">Weekly Plan</TabsTrigger>
            <TabsTrigger value="grocery">Grocery List</TabsTrigger>
          </TabsList>

          <TabsContent value="meals" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {kidFriendlyMeals.length} Kid-Friendly Meals
              </h2>
              <div className="flex gap-3">
                <Button
                  onClick={() => generateMealPlanMutation.mutate()}
                  disabled={generateMealPlanMutation.isPending}
                  variant="outline"
                  className="border-pink-200 text-pink-600 hover:bg-pink-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generateMealPlanMutation.isPending ? 'Generating...' : 'AI Meal Ideas'}
                </Button>
                <Button
                  onClick={() => setShowMealDialog(true)}
                  className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Meal
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kidFriendlyMeals.map((meal) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setExpandedMealId(expandedMealId === meal.id ? null : meal.id)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">{meal.name}</h3>
                        <Badge className="bg-pink-100 text-pink-700 border-0">
                          {meal.type}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {(meal.prep_time || 0) + (meal.cook_time || 0)} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {meal.servings || 4}
                        </div>
                      </div>
                      {expandedMealId === meal.id ? (
                        <div className="space-y-4">
                          {meal.ingredients && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Ingredients:</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {meal.ingredients.map((ing, idx) => (
                                  <li key={idx}>• {ing}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meal.instructions && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{meal.instructions}</p>
                            </div>
                          )}
                          <Button
                            onClick={(e) => { e.stopPropagation(); setSelectedMealForPlan(meal); setPlanDialog(true); }}
                            className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Add to Weekly Plan
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Ingredients: </span>
                          {meal.ingredients?.slice(0, 3).join(', ')}
                          {meal.ingredients && meal.ingredients.length > 3 && '...'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {kidFriendlyMeals.length === 0 && (
              <Card className="bg-white border-0 shadow-sm p-12 text-center">
                <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No meals yet</h3>
                <p className="text-gray-500 mb-4">Add meals manually or generate AI suggestions</p>
                <Button
                  onClick={() => generateMealPlanMutation.mutate()}
                  disabled={generateMealPlanMutation.isPending}
                  className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Meal Ideas
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plan">
            <div className="space-y-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                const dayMeals = mealPlans.filter(plan => plan.day_of_week === day);
                return (
                  <Card key={day} className="bg-white border-0 shadow-sm">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-gray-900 capitalize mb-3">{day}</h3>
                      {dayMeals.length === 0 ? (
                        <p className="text-gray-500 text-sm">No meals planned</p>
                      ) : (
                        <div className="space-y-2">
                          {dayMeals.map(plan => {
                            const mealDetails = meals.find(m => m.id === plan.meal_id);
                            return (
                              <div key={plan.id} className="bg-pink-50 p-3 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{plan.meal_name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{plan.meal_type}</div>
                                  </div>
                                  <button
                                    onClick={() => deleteFromMealPlanMutation.mutate(plan.id)}
                                    disabled={deleteFromMealPlanMutation.isPending}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {mealDetails?.ingredients && (
                                  <Button
                                    onClick={() => addToGroceryListMutation.mutate(mealDetails)}
                                    disabled={addToGroceryListMutation.isPending}
                                    size="sm"
                                    className="w-full bg-white text-pink-700 hover:bg-pink-100 border border-pink-200"
                                  >
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    {addToGroceryListMutation.isPending ? 'Adding...' : 'Add Ingredients to Grocery'}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="grocery" className="space-y-4">
            {groceries.length === 0 ? (
              <Card className="bg-white border-0 shadow-sm p-8 text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Grocery List</h3>
                <p className="text-gray-500">No items yet - add ingredients from your meal plan</p>
              </Card>
            ) : (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="space-y-3">
                    {groceries.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{item.category}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg">
                            <button
                              onClick={() => {
                                const qty = parseInt(item.quantity) || 0;
                                if (qty > 0) {
                                  updateGroceryQuantityMutation.mutate({ id: item.id, quantity: qty - 1 });
                                }
                              }}
                              disabled={updateGroceryQuantityMutation.isPending}
                              className="px-2 py-1 text-gray-500 hover:text-gray-900"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity || 1}</span>
                            <button
                              onClick={() => {
                                const qty = parseInt(item.quantity) || 0;
                                updateGroceryQuantityMutation.mutate({ id: item.id, quantity: qty + 1 });
                              }}
                              disabled={updateGroceryQuantityMutation.isPending}
                              className="px-2 py-1 text-gray-500 hover:text-gray-900"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => deleteGroceryItemMutation.mutate(item.id)}
                            disabled={deleteGroceryItemMutation.isPending}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showMealDialog} onOpenChange={setShowMealDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Meal name"
              value={newMeal.name || ''}
              onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
            />
            <Select
              value={newMeal.type}
              onValueChange={(value) => setNewMeal({ ...newMeal, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Meal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Ingredients (one per line)"
              value={newMeal.ingredients?.join('\n') || ''}
              onChange={(e) => setNewMeal({ ...newMeal, ingredients: e.target.value.split('\n').filter(i => i.trim()) })}
              rows={4}
            />
            <Textarea
              placeholder="Cooking instructions"
              value={newMeal.instructions || ''}
              onChange={(e) => setNewMeal({ ...newMeal, instructions: e.target.value })}
              rows={4}
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                type="number"
                placeholder="Prep time (min)"
                value={newMeal.prep_time || ''}
                onChange={(e) => setNewMeal({ ...newMeal, prep_time: parseInt(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Cook time (min)"
                value={newMeal.cook_time || ''}
                onChange={(e) => setNewMeal({ ...newMeal, cook_time: parseInt(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Servings"
                value={newMeal.servings || ''}
                onChange={(e) => setNewMeal({ ...newMeal, servings: parseInt(e.target.value) })}
              />
            </div>
            <Button
              onClick={() => createMealMutation.mutate({ ...newMeal, kid_friendly: true, age_range: '4-9 years' })}
              disabled={!newMeal.name || !newMeal.type}
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
            >
              Add Meal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {selectedMealForPlan?.name} to Weekly Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={planSelection.day}
              onValueChange={(value) => setPlanSelection({ ...planSelection, day: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
                <SelectItem value="saturday">Saturday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={planSelection.mealType}
              onValueChange={(value) => setPlanSelection({ ...planSelection, mealType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select meal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => addToMealPlanMutation.mutate()}
              disabled={!planSelection.day || !planSelection.mealType || addToMealPlanMutation.isPending}
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
            >
              {addToMealPlanMutation.isPending ? 'Adding...' : 'Add to Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
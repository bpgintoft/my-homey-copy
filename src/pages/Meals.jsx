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
import { Plus, ChefHat, ShoppingCart, Calendar, Clock, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Meals() {
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [newMeal, setNewMeal] = useState({});
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

  const createMealMutation = useMutation({
    mutationFn: (data) => base44.entities.Meal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['meals']);
      setShowMealDialog(false);
      setNewMeal({});
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
      <div className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-3">
            <ChefHat className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Meal Planning</h1>
          </div>
          <p className="text-white/90 text-lg">Kid-friendly meals for the whole family</p>
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
            <div className="flex justify-between items-center">
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
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
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
                      {meal.ingredients && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Ingredients: </span>
                          {meal.ingredients.slice(0, 3).join(', ')}
                          {meal.ingredients.length > 3 && '...'}
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
            <Card className="bg-white border-0 shadow-sm p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Weekly Meal Planner</h3>
              <p className="text-gray-500">Coming soon - Plan your meals for the week</p>
            </Card>
          </TabsContent>

          <TabsContent value="grocery">
            <Card className="bg-white border-0 shadow-sm p-8 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Grocery List</h3>
              <p className="text-gray-500">Coming soon - Auto-generated from your meal plan</p>
            </Card>
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
    </div>
  );
}
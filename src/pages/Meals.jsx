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
import { Plus, ChefHat, ShoppingCart, Calendar, Clock, Users, Sparkles, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Meals() {
  const [showMealDialog, setShowMealDialog] = useState(false);
    const [newMeal, setNewMeal] = useState({});
    const [editingMeal, setEditingMeal] = useState(null);
    const [selectedMealForPlan, setSelectedMealForPlan] = useState(null);
    const [planDialog, setPlanDialog] = useState(false);
    const [planSelection, setPlanSelection] = useState({ day: '', mealType: '' });
    const [expandedMealId, setExpandedMealId] = useState(null);
    const [pastedMealText, setPastedMealText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [generatedMeal, setGeneratedMeal] = useState(null);
    const [selectedProteins, setSelectedProteins] = useState([]);
    const [selectedMealTypes, setSelectedMealTypes] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [appliedProteins, setAppliedProteins] = useState([]);
            const [appliedMealTypes, setAppliedMealTypes] = useState([]);
            const [uploadingImage, setUploadingImage] = useState(false);
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

  const updateMealMutation = useMutation({
    mutationFn: (data) => base44.entities.Meal.update(editingMeal.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['meals']);
      setShowMealDialog(false);
      setEditingMeal(null);
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

  const deleteMealMutation = useMutation({
    mutationFn: (mealId) => base44.entities.Meal.delete(mealId),
    onSuccess: () => {
      queryClient.invalidateQueries(['meals']);
    },
  });

  const parseMealFromTextMutation = useMutation({
    mutationFn: async (mealText) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Parse this recipe/meal description and extract the following information. Return as JSON:\n\n${mealText}`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Meal name" },
            ingredients: { type: "array", items: { type: "string" }, description: "List of ingredients" },
            instructions: { type: "string", description: "Cooking instructions" },
            prep_time: { type: "number", description: "Prep time in minutes" },
            cook_time: { type: "number", description: "Cook time in minutes" },
            servings: { type: "number", description: "Number of servings" },
            cooking_method: { type: "string", enum: ["oven", "stovetop", "microwave"], description: "Primary cooking method" },
            cooking_temperature_or_heat: { type: "string", description: "Temperature or heat level" }
          }
        }
      });
      return result;
    },
    onSuccess: (parsedData) => {
      setNewMeal({
        name: parsedData.name || '',
        ingredients: parsedData.ingredients || [],
        instructions: parsedData.instructions || '',
        prep_time: parsedData.prep_time || '',
        cook_time: parsedData.cook_time || '',
        servings: parsedData.servings || '',
        cooking_method: parsedData.cooking_method || '',
        cooking_temperature_or_heat: parsedData.cooking_temperature_or_heat || '',
        type: 'dinner'
      });
      setPastedMealText('');
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
        prompt: `Create one kid-friendly dinner meal for a family with a 4-year-old and 9-year-old. Return as JSON with: name, ingredients (array), instructions, prep_time, cook_time, kid_friendly: true, age_range: "4-9 years", type: "dinner"`,
        response_json_schema: {
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
      });
      return result;
    },
    onSuccess: (meal) => {
      setGeneratedMeal(meal);
    },
  });

  const calculateNutritionMutation = useMutation({
    mutationFn: async (mealData) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Calculate nutrition facts per serving for this meal. Name: ${mealData.name}. Ingredients: ${mealData.ingredients?.join(', ') || 'not specified'}. Servings: ${mealData.servings || 4}. Return as JSON with estimated values per serving.`,
        response_json_schema: {
          type: "object",
          properties: {
            calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            fiber_g: { type: "number" },
            sugar_g: { type: "number" }
          }
        }
      });
      return result;
    },
    onSuccess: (nutrition) => {
      setNewMeal({ ...newMeal, nutrition });
    },
  });

  const kidFriendlyMeals = meals.filter(m => m.kid_friendly);

  const filteredMeals = kidFriendlyMeals.filter(meal => {
    const proteinMatch = appliedProteins.length === 0 || (meal.protein_type && appliedProteins.some(p => meal.protein_type.split(',').map(x => x.trim()).includes(p)));
    const typeMatch = appliedMealTypes.length === 0 || appliedMealTypes.some(t => meal.type.split(',').map(x => x.trim()).includes(t));
    return proteinMatch && typeMatch;
  });

  const handleSaveFilters = () => {
    setAppliedProteins(selectedProteins);
    setAppliedMealTypes(selectedMealTypes);
    setShowFilters(false);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    setNewMeal({ ...newMeal, photo_url: result.file_url });
    setUploadingImage(false);
  };

  React.useEffect(() => {
    if (!showMealDialog) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            handleImageUpload(blob);
            e.preventDefault();
          }
          return;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [showMealDialog]);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="relative overflow-hidden">
        <style>{`
          .meal-banner-bg {
            background: #E8A8D0;
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
          <TabsList className="bg-white shadow-sm border-b-2 border-gray-200 rounded-none">
            <TabsTrigger value="meals" className="border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent rounded-none">Meal Ideas</TabsTrigger>
            <TabsTrigger value="plan" className="border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent rounded-none">Weekly Plan</TabsTrigger>
            <TabsTrigger value="grocery" className="border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent rounded-none">Grocery List</TabsTrigger>
          </TabsList>

          <TabsContent value="meals" className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredMeals.length} Kid-Friendly Meals
            </h2>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-start">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="border-pink-200 text-pink-600 hover:bg-pink-50"
                  size="sm"
                >
                  Filter
                </Button>
                <Button
                  onClick={() => generateMealPlanMutation.mutate()}
                  disabled={generateMealPlanMutation.isPending}
                  variant="outline"
                  className="border-pink-200 text-pink-600 hover:bg-pink-50"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generateMealPlanMutation.isPending ? 'Generating...' : 'AI Meal Idea'}
                </Button>
                <Button
                  onClick={() => setShowMealDialog(true)}
                  className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Meal
                </Button>
              </div>

              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-pink-50 rounded-lg p-4 space-y-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Protein Type</p>
                    <div className="flex flex-wrap gap-2">
                      {['fish', 'beef', 'chicken', 'pork', 'turkey', 'vegetarian'].map(protein => (
                        <button
                          key={protein}
                          onClick={() => setSelectedProteins(prev => 
                            prev.includes(protein) ? prev.filter(p => p !== protein) : [...prev, protein]
                          )}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            selectedProteins.includes(protein)
                              ? 'bg-pink-600 text-white'
                              : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                          }`}
                        >
                          {protein.charAt(0).toUpperCase() + protein.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Meal Type</p>
                    <div className="flex flex-wrap gap-2">
                      {['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].map(type => (
                        <button
                          key={type}
                          onClick={() => setSelectedMealTypes(prev =>
                            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                          )}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            selectedMealTypes.includes(type)
                              ? 'bg-pink-600 text-white'
                              : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveFilters}
                    className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
                  >
                    Save Filter
                  </Button>
                </motion.div>
              )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeals.map((meal) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setExpandedMealId(expandedMealId === meal.id ? null : meal.id)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">{meal.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-pink-100 text-pink-700 border-0">
                            {meal.type}
                          </Badge>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMealMutation.mutate(meal.id); }}
                            disabled={deleteMealMutation.isPending}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-pink-100 text-pink-700 border-0">
                          {meal.type}
                        </Badge>
                        {meal.protein_type && (
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            {meal.protein_type}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {(meal.prep_time || 0) + (meal.cook_time || 0)} min
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Users className="w-4 h-4" />
                          {meal.servings || 4}
                        </div>
                        {meal.cooking_method && (
                          <div className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-medium">
                            {meal.cooking_method === 'oven' && `${meal.cooking_temperature_or_heat} • ${meal.cook_time}m`}
                            {meal.cooking_method === 'stovetop' && `Heat ${meal.cooking_temperature_or_heat} • ${meal.cook_time}m`}
                            {meal.cooking_method === 'microwave' && `Microwave ${meal.cook_time}m`}
                          </div>
                        )}
                      </div>
                      {expandedMealId === meal.id ? (
                        <div className="space-y-4">
                          {meal.photo_url && (
                            <div className="w-full h-48 rounded-lg overflow-hidden">
                              <img src={meal.photo_url} alt={meal.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          {meal.ingredients && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Ingredients:</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {meal.ingredients.map((ing, idx) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="flex-shrink-0">•</span>
                                    <span>{ing}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meal.instructions && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {meal.instructions.split(/(?<=[.!?])\s+/).map((sentence, idx) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="flex-shrink-0">•</span>
                                    <span>{sentence.trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meal.recipe_url && (
                            <a
                              href={meal.recipe_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
                            >
                              View Recipe <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {meal.nutrition && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2 text-sm">Nutrition (per serving)</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div><span className="font-medium">{meal.nutrition.calories}</span> cal</div>
                                <div><span className="font-medium">{meal.nutrition.protein_g}g</span> protein</div>
                                <div><span className="font-medium">{meal.nutrition.carbs_g}g</span> carbs</div>
                                <div><span className="font-medium">{meal.nutrition.fat_g}g</span> fat</div>
                                {meal.nutrition.fiber_g && <div><span className="font-medium">{meal.nutrition.fiber_g}g</span> fiber</div>}
                                {meal.nutrition.sugar_g && <div><span className="font-medium">{meal.nutrition.sugar_g}g</span> sugar</div>}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={(e) => { e.stopPropagation(); setEditingMeal(meal); setNewMeal(meal); setShowMealDialog(true); }}
                              variant="outline"
                              className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50"
                            >
                              Edit Meal
                            </Button>
                            <Button
                              onClick={(e) => { e.stopPropagation(); setSelectedMealForPlan(meal); setPlanDialog(true); }}
                              className="flex-1 bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Add to Plan
                            </Button>
                          </div>
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

            {filteredMeals.length === 0 && (
              <Card className="bg-white border-0 shadow-sm p-12 text-center">
                <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{appliedProteins.length > 0 || appliedMealTypes.length > 0 ? 'No meals match your filters' : 'No meals yet'}</h3>
                <p className="text-gray-500 mb-4">{appliedProteins.length > 0 || appliedMealTypes.length > 0 ? 'Try adjusting your filters' : 'Add meals manually or generate AI suggestions'}</p>
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
                            const isExpanded = expandedMealId === `plan-${plan.id}`;
                            return (
                              <div 
                                key={plan.id} 
                                className="bg-pink-50 p-3 rounded-lg space-y-2 cursor-pointer hover:bg-pink-100 transition-colors"
                                onClick={() => setExpandedMealId(isExpanded ? null : `plan-${plan.id}`)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{plan.meal_name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{plan.meal_type}</div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteFromMealPlanMutation.mutate(plan.id); }}
                                    disabled={deleteFromMealPlanMutation.isPending}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {isExpanded && (
                                  <div className="space-y-3 pt-2 border-t border-pink-200">
                                    {mealDetails?.ingredients && (
                                                <div>
                                                  <h4 className="font-medium text-gray-900 mb-2">Ingredients:</h4>
                                                  <ul className="text-sm text-gray-600 space-y-1">
                                                    {mealDetails.ingredients.map((ing, idx) => (
                                                      <li key={idx} className="flex gap-2">
                                                        <span className="flex-shrink-0">•</span>
                                                        <span>{ing}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                    {mealDetails?.instructions && (
                                                <div>
                                                  <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                                                  <ul className="text-sm text-gray-600 space-y-1">
                                                    {mealDetails.instructions.split(/(?<=[.!?])\s+/).map((sentence, idx) => (
                                                      <li key={idx} className="flex gap-2">
                                                        <span className="flex-shrink-0">•</span>
                                                        <span>{sentence.trim()}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                    {mealDetails?.recipe_url && (
                                      <a
                                        href={mealDetails.recipe_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
                                      >
                                        View Recipe <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                    {mealDetails?.ingredients && (
                                      <Button
                                        onClick={(e) => { e.stopPropagation(); addToGroceryListMutation.mutate(mealDetails); }}
                                        disabled={addToGroceryListMutation.isPending}
                                        size="sm"
                                        className="w-full bg-white text-pink-700 hover:bg-pink-100 border border-pink-200"
                                      >
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        {addToGroceryListMutation.isPending ? 'Adding...' : 'Add Ingredients to Grocery'}
                                      </Button>
                                    )}
                                  </div>
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

            <Dialog open={!!generatedMeal} onOpenChange={(open) => !open && setGeneratedMeal(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>AI-Generated Meal</DialogTitle>
                </DialogHeader>
                {generatedMeal && (
                  <div className="space-y-4 overflow-y-auto flex-1">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{generatedMeal.name}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-pink-100 text-pink-700 border-0">{generatedMeal.type}</Badge>
                  <Badge className="bg-blue-100 text-blue-700 border-0">{generatedMeal.age_range}</Badge>
                </div>
              </div>
              {generatedMeal.ingredients && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Ingredients:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {generatedMeal.ingredients.map((ing, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="flex-shrink-0">•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {generatedMeal.instructions && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {generatedMeal.instructions.split(/(?<=[.!?])\s+/).map((sentence, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="flex-shrink-0">•</span>
                        <span>{sentence.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    createMealMutation.mutate(generatedMeal);
                    setGeneratedMeal(null);
                  }}
                  disabled={createMealMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
                >
                  Add to Meal Ideas
                </Button>
                <Button
                  onClick={() => setGeneratedMeal(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Trash
                </Button>
              </div>
            </div>
            )}
            </DialogContent>
            </Dialog>

      <Dialog open={showMealDialog} onOpenChange={(open) => { setShowMealDialog(open); if (!open) { setEditingMeal(null); setNewMeal({}); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white">
          <DialogHeader>
            <DialogTitle>{editingMeal ? 'Edit Meal' : 'Add New Meal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto flex-1 pr-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">Paste a recipe from online:</label>
              <Textarea
                placeholder="Paste the entire recipe here... (we'll parse it automatically)"
                value={pastedMealText}
                onChange={(e) => setPastedMealText(e.target.value)}
                rows={4}
                className="text-sm"
              />
              <Button
                onClick={() => parseMealFromTextMutation.mutate(pastedMealText)}
                disabled={!pastedMealText || parseMealFromTextMutation.isPending}
                className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
              >
                {parseMealFromTextMutation.isPending ? 'Parsing...' : 'Parse Recipe'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or fill in manually</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Meal Image</label>
                <p className="text-xs text-gray-500 mb-2">Choose file or Ctrl+V to paste image</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  disabled={uploadingImage}
                />
                {uploadingImage && <span className="text-sm text-gray-500 mt-2 block">Uploading...</span>}
                {newMeal.photo_url && (
                  <div className="mt-2 w-full h-32 rounded-lg overflow-hidden">
                    <img src={newMeal.photo_url} alt="Meal preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <Input
                placeholder="Meal name"
                value={newMeal.name || ''}
                onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
              />
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Meal Type(s)</label>
                <div className="flex flex-wrap gap-2">
                  {['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].map(type => {
                    const types = newMeal.type ? newMeal.type.split(',').map(t => t.trim()) : [];
                    const isSelected = types.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          const newTypes = isSelected 
                            ? types.filter(t => t !== type)
                            : [...types, type];
                          setNewMeal({ ...newMeal, type: newTypes.join(',') });
                        }}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-pink-600 text-white'
                            : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Protein Type(s)</label>
                <div className="flex flex-wrap gap-2">
                  {['fish', 'beef', 'chicken', 'pork', 'turkey', 'vegetarian'].map(protein => {
                    const proteins = newMeal.protein_type ? newMeal.protein_type.split(',').map(p => p.trim()) : [];
                    const isSelected = proteins.includes(protein);
                    return (
                      <button
                        key={protein}
                        onClick={() => {
                          const newProteins = isSelected
                            ? proteins.filter(p => p !== protein)
                            : [...proteins, protein];
                          setNewMeal({ ...newMeal, protein_type: newProteins.join(',') });
                        }}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-pink-600 text-white'
                            : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                        }`}
                      >
                        {protein.charAt(0).toUpperCase() + protein.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Cooking Method</label>
                <Select
                  value={newMeal.cooking_method || ''}
                  onValueChange={(value) => setNewMeal({ ...newMeal, cooking_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cooking method (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oven">Oven</SelectItem>
                    <SelectItem value="stovetop">Stovetop</SelectItem>
                    <SelectItem value="microwave">Microwave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newMeal.cooking_method && newMeal.cooking_method !== 'microwave' && (
                <Input
                  placeholder={newMeal.cooking_method === 'oven' ? 'Temperature (e.g., 350°F)' : 'Heat level (1-10)'}
                  value={newMeal.cooking_temperature_or_heat || ''}
                  onChange={(e) => setNewMeal({ ...newMeal, cooking_temperature_or_heat: e.target.value })}
                />
              )}
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
              <Input
                placeholder="Recipe URL (optional)"
                value={newMeal.recipe_url || ''}
                onChange={(e) => setNewMeal({ ...newMeal, recipe_url: e.target.value })}
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
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => calculateNutritionMutation.mutate(newMeal)}
                  disabled={!newMeal.name || !newMeal.ingredients?.length || calculateNutritionMutation.isPending}
                  variant="outline"
                  className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                >
                  {calculateNutritionMutation.isPending ? 'Calculating...' : 'Calculate Nutrition'}
                </Button>
                {newMeal.nutrition && (
                  <div className="bg-pink-50 p-3 rounded-lg text-sm">
                    <div className="grid grid-cols-2 gap-2 text-gray-700">
                      <div><span className="font-medium">{newMeal.nutrition.calories}</span> cal</div>
                      <div><span className="font-medium">{newMeal.nutrition.protein_g}g</span> protein</div>
                      <div><span className="font-medium">{newMeal.nutrition.carbs_g}g</span> carbs</div>
                      <div><span className="font-medium">{newMeal.nutrition.fat_g}g</span> fat</div>
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => {
                    if (editingMeal) {
                      updateMealMutation.mutate(newMeal);
                    } else {
                      createMealMutation.mutate({ ...newMeal, kid_friendly: true, age_range: '4-9 years' });
                    }
                  }}
                  disabled={!newMeal.name || !newMeal.type}
                  className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
                >
                  {editingMeal ? 'Save Changes' : 'Add Meal'}
                </Button>
              </div>
              </div>
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
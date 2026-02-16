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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, ChefHat, ShoppingCart, Calendar, Clock, Users, Sparkles, Trash2, ExternalLink, BarChart3, Beef, Fish, Leaf, Drumstick, Star, ChevronDown, ChevronUp, Coffee, UtensilsCrossed, Utensils, Apple, IceCream } from 'lucide-react';
import { motion } from 'framer-motion';
import { getThumbnailUrl, getMediumUrl } from '../components/imageHelpers';
import ProteinTypeFilter from '../components/ProteinTypeFilter';

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
    const [selectedRatings, setSelectedRatings] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [appliedProteins, setAppliedProteins] = useState([]);
            const [appliedMealTypes, setAppliedMealTypes] = useState([]);
            const [appliedRatings, setAppliedRatings] = useState([]);
            const [uploadingImage, setUploadingImage] = useState(false);
            const [expandedSections, setExpandedSections] = useState({});
            const [shoppingMode, setShoppingMode] = useState(false);
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
    // Basic seasonings
    'salt', 'pepper', 'black pepper', 'sea salt', 'kosher salt', 'garlic salt', 'onion powder', 'garlic powder',
    // Oils and fats
    'butter', 'oil', 'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'cooking spray',
    // Basic produce
    'garlic', 'onion', 'onions', 'lemon', 'lime',
    // Liquids
    'water', 'milk', 'broth', 'stock', 'chicken broth', 'beef broth', 'vegetable broth',
    // Baking basics
    'sugar', 'brown sugar', 'flour', 'all-purpose flour', 'baking powder', 'baking soda', 'vanilla extract', 'vanilla', 'yeast',
    // Herbs and spices
    'cinnamon', 'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'rosemary', 'parsley', 'dill', 'sage', 'bay leaf', 'bay leaves',
    'chili powder', 'cayenne', 'ginger', 'nutmeg', 'cloves', 'cardamom', 'turmeric', 'coriander', 'red pepper flakes', 'italian seasoning',
    // Condiments and sauces
    'honey', 'soy sauce', 'vinegar', 'balsamic vinegar', 'apple cider vinegar', 'white vinegar', 'rice vinegar',
    'lemon juice', 'lime juice', 'worcestershire sauce', 'hot sauce', 'mayonnaise', 'ketchup', 'mustard', 'dijon mustard',
    // Starches and grains
    'rice', 'white rice', 'brown rice', 'pasta', 'bread', 'breadcrumbs', 'panko',
    // Other basics
    'eggs', 'cornstarch', 'corn starch', 'tomato paste', 'chicken stock', 'beef stock'
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

  const updateMealRatingMutation = useMutation({
    mutationFn: ({ id, rating, currentRating }) => {
      const newRating = currentRating === rating ? 0 : rating;
      return base44.entities.Meal.update(id, { rating: newRating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meals']);
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: async (ingredient) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Categorize this grocery item: "${ingredient}". Return only the category key.`,
        response_json_schema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["produce", "meat_seafood", "dairy_eggs", "bakery", "pantry", "frozen", "beverages", "deli", "other"]
            }
          }
        }
      });
      return result.category;
    }
  });

  const cleanIngredientName = (ingredient) => {
    return ingredient
      // Remove everything up to and including measurement units (greedy match to catch all preceding numbers/fractions)
      .replace(/^.*?(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|cans?|packages?|boxes?|jars?|containers?)\s+/i, '')
      // Remove any remaining leading numbers, fractions, "to", "of", slashes, dashes
      .replace(/^[\/\d\s\-]*(to|of)?\s*/gi, '')
      // Remove parenthetical info
      .replace(/\(.*?\)/g, '')
      .trim();
  };

  const addToGroceryListMutation = useMutation({
        mutationFn: async (meal) => {
          const filteredIngredients = filterStaples(meal.ingredients || []);
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());

          for (const ingredient of filteredIngredients) {
            const cleanedName = cleanIngredientName(ingredient);
            if (!cleanedName) continue;

            const existing = groceries.find(g => g.name.toLowerCase() === cleanedName.toLowerCase());
            if (existing) {
              const qty = parseInt(existing.quantity) || 1;
              await base44.entities.GroceryItem.update(existing.id, { quantity: (qty + 1).toString() });
            } else {
              const category = await categorizeMutation.mutateAsync(cleanedName);
              await base44.entities.GroceryItem.create({
                name: cleanedName,
                category: category || 'other',
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
        prompt: `Parse this recipe/meal description and extract the following information. If nutrition facts are provided, extract them. Return as JSON:\n\n${mealText}`,
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
            cooking_temperature_or_heat: { type: "string", description: "Temperature or heat level" },
            nutrition: {
              type: "object",
              description: "Nutrition facts per serving if provided",
              properties: {
                calories: { type: "number" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
                fiber_g: { type: "number" },
                sugar_g: { type: "number" }
              }
            }
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
        nutrition: parsedData.nutrition || undefined,
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

    const togglePurchasedMutation = useMutation({
      mutationFn: ({ id, purchased }) => base44.entities.GroceryItem.update(id, { purchased }),
      onSuccess: () => {
        queryClient.invalidateQueries(['groceries']);
      },
    });

    const updateGroceryNameMutation = useMutation({
        mutationFn: ({ id, name }) => base44.entities.GroceryItem.update(id, { name }),
        onSuccess: () => {
          queryClient.invalidateQueries(['groceries']);
        },
      });

      const addAllWeeklyIngredientsToGroceryMutation = useMutation({
        mutationFn: async () => {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());

          // First, collect and combine all ingredients
          const ingredientCounts = {};

          for (const plan of mealPlans) {
            const mealDetails = meals.find(m => m.id === plan.meal_id);
            if (mealDetails?.ingredients) {
              const filteredIngredients = filterStaples(mealDetails.ingredients);
              for (const ingredient of filteredIngredients) {
                const cleanedName = cleanIngredientName(ingredient);
                if (!cleanedName) continue;

                const lowerName = cleanedName.toLowerCase();
                ingredientCounts[lowerName] = {
                  name: cleanedName,
                  count: (ingredientCounts[lowerName]?.count || 0) + 1
                };
              }
            }
          }

          // Now update/create grocery items with combined quantities
          for (const ingredientData of Object.values(ingredientCounts)) {
            const existing = groceries.find(g => g.name.toLowerCase() === ingredientData.name.toLowerCase());
            if (existing) {
              const qty = parseInt(existing.quantity) || 1;
              await base44.entities.GroceryItem.update(existing.id, { 
                quantity: (qty + ingredientData.count).toString() 
              });
            } else {
              const category = await categorizeMutation.mutateAsync(ingredientData.name);
              await base44.entities.GroceryItem.create({
                name: ingredientData.name,
                category: category || 'other',
                quantity: ingredientData.count.toString(),
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

      const clearAllGroceriesMutation = useMutation({
        mutationFn: async () => {
          for (const item of groceries) {
            await base44.entities.GroceryItem.delete(item.id);
          }
        },
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

  const calculateDailyNutrients = (dayMeals) => {
    if (!dayMeals || dayMeals.length === 0) return null;

    const totals = {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0
    };

    dayMeals.forEach(plan => {
      const meal = meals.find(m => m.id === plan.meal_id);
      if (meal?.nutrition) {
        totals.calories += meal.nutrition.calories || 0;
        totals.protein_g += meal.nutrition.protein_g || 0;
        totals.carbs_g += meal.nutrition.carbs_g || 0;
        totals.fat_g += meal.nutrition.fat_g || 0;
        totals.fiber_g += meal.nutrition.fiber_g || 0;
        totals.sugar_g += meal.nutrition.sugar_g || 0;
      }
    });

    return totals;
  };

  const kidFriendlyMeals = meals.filter(m => m.kid_friendly);

  const filteredMeals = kidFriendlyMeals.filter(meal => {
    const proteinMatch = appliedProteins.length === 0 || (meal.protein_type && appliedProteins.some(p => meal.protein_type.split(',').map(x => x.trim()).includes(p)));
    const typeMatch = appliedMealTypes.length === 0 || appliedMealTypes.some(t => meal.type.split(',').map(x => x.trim()).includes(t));
    const ratingMatch = appliedRatings.length === 0 || appliedRatings.includes(meal.rating || 0);
    const favoritesMatch = !showFavoritesOnly || (meal.rating >= 4);
    return proteinMatch && typeMatch && ratingMatch && favoritesMatch;
  });

  const handleSaveFilters = () => {
    setAppliedProteins(selectedProteins);
    setAppliedMealTypes(selectedMealTypes);
    setAppliedRatings(selectedRatings);
    setShowFilters(false);
  };

  const getProteinIcon = (proteinType) => {
    if (!proteinType) return null;
    const type = proteinType.toLowerCase();
    if (type.includes('beef')) return <span className="text-xl">🥩</span>;
    if (type.includes('chicken')) return <span className="text-xl">🍗</span>;
    if (type.includes('fish')) return <span className="text-xl">🐟</span>;
    if (type.includes('beans')) return <span className="text-xl">🫘</span>;
    if (type.includes('vegetarian')) return <span className="text-xl">🥬</span>;
    if (type.includes('pork')) return <span className="text-xl">🍖</span>;
    if (type.includes('turkey')) return <span className="text-xl">🦃</span>;
    if (type.includes('eggs')) return <span className="text-xl">🥚</span>;
    return null;
  };

  const getMealTypeIcon = (mealType) => {
    if (!mealType) return null;
    const types = mealType.toLowerCase().split(',').map(t => t.trim());
    const order = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
    const sortedTypes = types.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    
    return sortedTypes.map((type, idx) => {
      if (type === 'breakfast') return <Coffee key={idx} className="w-4 h-4 text-orange-600" />;
      if (type === 'lunch') return <UtensilsCrossed key={idx} className="w-4 h-4 text-blue-600" />;
      if (type === 'dinner') return <Utensils key={idx} className="w-4 h-4 text-indigo-600" />;
      if (type === 'snack') return <Apple key={idx} className="w-4 h-4 text-green-600" />;
      if (type === 'dessert') return <IceCream key={idx} className="w-4 h-4 text-pink-500" />;
      return null;
    }).filter(Boolean);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    setNewMeal({ ...newMeal, photo_url: result.file_url });
    setUploadingImage(false);
  };

  const toggleSection = (mealId, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${mealId}-${section}`]: !prev[`${mealId}-${section}`]
    }));
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
              <div className="flex gap-1 items-start overflow-x-auto">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="border-pink-200 text-pink-600 hover:bg-pink-50 px-2 flex-shrink-0 text-xs"
                  size="sm"
                >
                  Filter
                </Button>
                <Button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  variant="outline"
                  className={`${showFavoritesOnly ? 'bg-pink-100 border-pink-300' : 'border-pink-200'} text-pink-600 hover:bg-pink-50 px-1.5 flex-shrink-0`}
                  size="sm"
                >
                  <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-pink-600' : ''}`} />
                </Button>
                <Button
                  onClick={() => generateMealPlanMutation.mutate()}
                  disabled={generateMealPlanMutation.isPending}
                  variant="outline"
                  className="border-pink-200 text-pink-600 hover:bg-pink-50 px-2 flex-shrink-0 text-xs whitespace-nowrap"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  AI Meal Idea
                </Button>
                <Button
                  onClick={() => setShowMealDialog(true)}
                  className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white px-2 flex-shrink-0 text-xs"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Meal
                </Button>
              </div>

              <ProteinTypeFilter 
                selectedProteins={appliedProteins}
                onSelectionChange={setAppliedProteins}
              />

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
                      {['fish', 'beef', 'chicken', 'pork', 'turkey', 'beans', 'eggs', 'vegetarian'].map(protein => (
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
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Star Rating</p>
                    <div className="flex flex-wrap gap-2">
                      {[5, 4, 3, 2, 1].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setSelectedRatings(prev =>
                            prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
                          )}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                            selectedRatings.includes(rating)
                              ? 'bg-pink-600 text-white'
                              : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                          }`}
                        >
                          <Star className="w-3 h-3 fill-current" />
                          {rating}
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
                  className="min-w-0"
                >
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden" onClick={() => setExpandedMealId(expandedMealId === meal.id ? null : meal.id)}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {meal.photo_url && (
                            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                              <img src={getThumbnailUrl(meal.photo_url)} alt={meal.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 truncate min-w-0 flex-1">{meal.name}</h3>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteMealMutation.mutate(meal.id); }}
                              disabled={deleteMealMutation.isPending}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {meal.protein_type && (
                              <div className="flex-shrink-0">
                                {getProteinIcon(meal.protein_type)}
                              </div>
                            )}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-pink-200 hover:bg-pink-50 transition-colors"
                                >
                                  <Star className="w-3 h-3 fill-pink-500 text-pink-500" />
                                  <span className="text-xs font-medium text-gray-900">{meal.rating || 0}</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      onClick={() => updateMealRatingMutation.mutate({ id: meal.id, rating: star, currentRating: meal.rating || 0 })}
                                      className="transition-colors"
                                    >
                                      <Star
                                        className={`w-5 h-5 ${
                                          star <= (meal.rating || 0)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            {getMealTypeIcon(meal.type)}
                          </div>
                        </div>
                      </div>
                      {expandedMealId === meal.id && (
                        <div className="space-y-3 pt-4 border-t border-gray-200">
                          {meal.photo_url && (
                            <div className="w-full h-48 rounded-lg overflow-hidden">
                              <img src={getMediumUrl(meal.photo_url)} alt={meal.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {(meal.prep_time || 0) + (meal.cook_time || 0)} min
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {meal.servings || 4} servings
                            </div>
                          </div>
                          {meal.cooking_method && (
                            <div className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-medium w-fit">
                              {meal.cooking_method === 'oven' && `${meal.cooking_temperature_or_heat} • ${meal.cook_time}m`}
                              {meal.cooking_method === 'stovetop' && `Heat ${meal.cooking_temperature_or_heat} • ${meal.cook_time}m`}
                              {meal.cooking_method === 'microwave' && `Microwave ${meal.cook_time}m`}
                            </div>
                          )}

                          {meal.ingredients && (
                            <div>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleSection(meal.id, 'ingredients'); }}
                                className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <span className="font-medium text-gray-900">Ingredients</span>
                                {expandedSections[`${meal.id}-ingredients`] ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                              {expandedSections[`${meal.id}-ingredients`] && (
                                <ul className="text-sm text-gray-600 space-y-1 mt-2 px-3">
                                  {meal.ingredients.map((ing, idx) => (
                                    <li key={idx} className="flex gap-2">
                                      <span className="flex-shrink-0">•</span>
                                      <span>{ing}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {meal.instructions && (
                            <div>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleSection(meal.id, 'directions'); }}
                                className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <span className="font-medium text-gray-900">Directions</span>
                                {expandedSections[`${meal.id}-directions`] ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                              {expandedSections[`${meal.id}-directions`] && (
                                <ul className="text-sm text-gray-600 space-y-1 mt-2 px-3">
                                  {meal.instructions.split(/(?<=[.!?])\s+/).map((sentence, idx) => (
                                    <li key={idx} className="flex gap-2">
                                      <span className="flex-shrink-0">•</span>
                                      <span>{sentence.trim()}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {meal.nutrition && (
                            <div>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleSection(meal.id, 'nutrition'); }}
                                className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <span className="font-medium text-gray-900">Nutrition (per serving)</span>
                                {expandedSections[`${meal.id}-nutrition`] ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                              {expandedSections[`${meal.id}-nutrition`] && (
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2 px-3">
                                  <div><span className="font-medium">{meal.nutrition.calories}</span> cal</div>
                                  <div><span className="font-medium">{meal.nutrition.protein_g}g</span> protein</div>
                                  <div><span className="font-medium">{meal.nutrition.carbs_g}g</span> carbs</div>
                                  <div><span className="font-medium">{meal.nutrition.fat_g}g</span> fat</div>
                                  {meal.nutrition.fiber_g && <div><span className="font-medium">{meal.nutrition.fiber_g}g</span> fiber</div>}
                                  {meal.nutrition.sugar_g && <div><span className="font-medium">{meal.nutrition.sugar_g}g</span> sugar</div>}
                                </div>
                              )}
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
                      <div className="flex gap-2">
                        <Button
                          onClick={() => addAllWeeklyIngredientsToGroceryMutation.mutate()}
                          disabled={addAllWeeklyIngredientsToGroceryMutation.isPending || mealPlans.length === 0}
                          className="flex-1 bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white whitespace-normal h-auto py-1.5"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="text-sm md:text-base">{addAllWeeklyIngredientsToGroceryMutation.isPending ? 'Adding...' : 'Add All Weekly Meal Ingredients to Grocery List'}</span>
                        </Button>
                        <Button
                          onClick={() => mealPlans.forEach(plan => deleteFromMealPlanMutation.mutate(plan.id))}
                          disabled={deleteFromMealPlanMutation.isPending || mealPlans.length === 0}
                          variant="outline"
                          className="max-w-20 border-red-200 text-red-600 hover:bg-red-50 text-xs h-auto py-1.5 whitespace-normal"
                        >
                          Clear Plan
                        </Button>
                      </div>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                const dayMeals = mealPlans.filter(plan => plan.day_of_week === day);
                const dailyNutrients = calculateDailyNutrients(dayMeals);
                return (
                  <Card key={day} className="bg-white border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 capitalize">{day}</h3>
                        {dailyNutrients && dayMeals.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="border-pink-200 text-pink-600 hover:bg-pink-50"
                              >
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Daily Nutrients
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">Daily Total ({dayMeals.length} meal{dayMeals.length !== 1 ? 's' : ''})</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <div className="text-gray-500">Calories</div>
                                    <div className="text-lg font-bold text-gray-900">{dailyNutrients.calories}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Protein</div>
                                    <div className="text-lg font-bold text-gray-900">{dailyNutrients.protein_g}g</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Carbs</div>
                                    <div className="text-lg font-bold text-gray-900">{dailyNutrients.carbs_g}g</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Fat</div>
                                    <div className="text-lg font-bold text-gray-900">{dailyNutrients.fat_g}g</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Fiber</div>
                                    <div className="text-lg font-bold text-gray-900">{dailyNutrients.fiber_g}g</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Sugar</div>
                                    <div className="text-lg font-bold text-gray-900">{dailyNutrients.sugar_g}g</div>
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
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
                                    {mealDetails?.photo_url && (
                                      <div className="w-full h-48 rounded-lg overflow-hidden">
                                        <img src={getMediumUrl(mealDetails.photo_url)} alt={mealDetails.name} className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                    {mealDetails?.cooking_method && (
                                      <div className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-medium w-fit">
                                        {mealDetails.cooking_method === 'oven' && `${mealDetails.cooking_temperature_or_heat} • ${mealDetails.cook_time}m`}
                                        {mealDetails.cooking_method === 'stovetop' && `Heat ${mealDetails.cooking_temperature_or_heat} • ${mealDetails.cook_time}m`}
                                        {mealDetails.cooking_method === 'microwave' && `Microwave ${mealDetails.cook_time}m`}
                                      </div>
                                    )}

                                    {mealDetails?.ingredients && (
                                      <div>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleSection(plan.id, 'ingredients'); }}
                                          className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <span className="font-medium text-gray-900">Ingredients</span>
                                          {expandedSections[`${plan.id}-ingredients`] ? (
                                            <ChevronUp className="w-4 h-4 text-gray-500" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                          )}
                                        </button>
                                        {expandedSections[`${plan.id}-ingredients`] && (
                                          <ul className="text-sm text-gray-600 space-y-1 mt-2 px-3">
                                            {mealDetails.ingredients.map((ing, idx) => (
                                              <li key={idx} className="flex gap-2">
                                                <span className="flex-shrink-0">•</span>
                                                <span>{ing}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    )}

                                    {mealDetails?.instructions && (
                                      <div>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleSection(plan.id, 'directions'); }}
                                          className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <span className="font-medium text-gray-900">Directions</span>
                                          {expandedSections[`${plan.id}-directions`] ? (
                                            <ChevronUp className="w-4 h-4 text-gray-500" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                          )}
                                        </button>
                                        {expandedSections[`${plan.id}-directions`] && (
                                          <ul className="text-sm text-gray-600 space-y-1 mt-2 px-3">
                                            {mealDetails.instructions.split(/(?<=[.!?])\s+/).map((sentence, idx) => (
                                              <li key={idx} className="flex gap-2">
                                                <span className="flex-shrink-0">•</span>
                                                <span>{sentence.trim()}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    )}

                                    {mealDetails?.nutrition && (
                                      <div>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleSection(plan.id, 'nutrition'); }}
                                          className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <span className="font-medium text-gray-900">Nutrition (per serving)</span>
                                          {expandedSections[`${plan.id}-nutrition`] ? (
                                            <ChevronUp className="w-4 h-4 text-gray-500" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                          )}
                                        </button>
                                        {expandedSections[`${plan.id}-nutrition`] && (
                                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2 px-3">
                                            <div><span className="font-medium">{mealDetails.nutrition.calories}</span> cal</div>
                                            <div><span className="font-medium">{mealDetails.nutrition.protein_g}g</span> protein</div>
                                            <div><span className="font-medium">{mealDetails.nutrition.carbs_g}g</span> carbs</div>
                                            <div><span className="font-medium">{mealDetails.nutrition.fat_g}g</span> fat</div>
                                          </div>
                                        )}
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
            {groceries.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShoppingMode(!shoppingMode)}
                  variant="outline"
                  className={`flex-1 ${shoppingMode ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-pink-200 text-pink-600'} hover:bg-pink-50`}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {shoppingMode ? 'Exit Shopping Mode' : 'Shopping Mode'}
                </Button>
                {!shoppingMode && (
                  <Button
                    onClick={() => clearAllGroceriesMutation.mutate()}
                    disabled={clearAllGroceriesMutation.isPending}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {clearAllGroceriesMutation.isPending ? 'Clearing...' : 'Clear All'}
                  </Button>
                )}
              </div>
            )}
            {groceries.length === 0 ? (
              <Card className="bg-white border-0 shadow-sm p-8 text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Grocery List</h3>
                <p className="text-gray-500">No items yet - add ingredients from your meal plan</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {[
                  { key: 'produce', label: 'Produce', emoji: '🥬' },
                  { key: 'meat_seafood', label: 'Meat & Seafood', emoji: '🥩' },
                  { key: 'dairy_eggs', label: 'Dairy & Eggs', emoji: '🥛' },
                  { key: 'bakery', label: 'Bakery', emoji: '🥖' },
                  { key: 'pantry', label: 'Pantry & Dry Goods', emoji: '🥫' },
                  { key: 'frozen', label: 'Frozen Foods', emoji: '❄️' },
                  { key: 'beverages', label: 'Beverages', emoji: '🥤' },
                  { key: 'deli', label: 'Deli', emoji: '🧀' },
                  { key: 'other', label: 'Other', emoji: '🛒' }
                ].map(({ key, label, emoji }) => {
                  const categoryItems = groceries.filter(item => item.category === key);
                  if (categoryItems.length === 0) return null;

                  return (
                    <Card key={key} className="bg-white border-0 shadow-sm">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-xl">{emoji}</span>
                          {label}
                        </h3>
                        <div className="space-y-2">
                          {categoryItems.map((item) => (
                            <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                              shoppingMode 
                                ? item.purchased 
                                  ? 'bg-gray-100' 
                                  : 'bg-white border-2 border-pink-200' 
                                : 'bg-gray-50'
                            }`}>
                              {shoppingMode && (
                                <input
                                  type="checkbox"
                                  checked={item.purchased || false}
                                  onChange={(e) => togglePurchasedMutation.mutate({ id: item.id, purchased: e.target.checked })}
                                  className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                {shoppingMode ? (
                                  <div className={`text-sm font-medium ${item.purchased ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                    {item.name} {item.quantity && parseInt(item.quantity) > 1 ? `(${item.quantity})` : ''}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateGroceryNameMutation.mutate({ id: item.id, name: e.target.value })}
                                    className="text-sm font-medium text-gray-900 bg-transparent border-none outline-none w-full focus:bg-white focus:px-2 focus:py-1 focus:rounded transition-all"
                                  />
                                )}
                              </div>
                              {!shoppingMode && (
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
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
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
                  {['fish', 'beef', 'chicken', 'pork', 'turkey', 'beans', 'eggs', 'vegetarian'].map(protein => {
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Nutrition Facts (per serving) - Optional</label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder="Calories"
                    value={newMeal.nutrition?.calories || ''}
                    onChange={(e) => setNewMeal({ ...newMeal, nutrition: { ...newMeal.nutrition, calories: parseInt(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    placeholder="Protein (g)"
                    value={newMeal.nutrition?.protein_g || ''}
                    onChange={(e) => setNewMeal({ ...newMeal, nutrition: { ...newMeal.nutrition, protein_g: parseInt(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    placeholder="Carbs (g)"
                    value={newMeal.nutrition?.carbs_g || ''}
                    onChange={(e) => setNewMeal({ ...newMeal, nutrition: { ...newMeal.nutrition, carbs_g: parseInt(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    placeholder="Fat (g)"
                    value={newMeal.nutrition?.fat_g || ''}
                    onChange={(e) => setNewMeal({ ...newMeal, nutrition: { ...newMeal.nutrition, fat_g: parseInt(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    placeholder="Fiber (g)"
                    value={newMeal.nutrition?.fiber_g || ''}
                    onChange={(e) => setNewMeal({ ...newMeal, nutrition: { ...newMeal.nutrition, fiber_g: parseInt(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    placeholder="Sugar (g)"
                    value={newMeal.nutrition?.sugar_g || ''}
                    onChange={(e) => setNewMeal({ ...newMeal, nutrition: { ...newMeal.nutrition, sugar_g: parseInt(e.target.value) } })}
                  />
                </div>
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
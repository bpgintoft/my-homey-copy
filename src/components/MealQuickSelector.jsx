import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, Coffee, UtensilsCrossed, Utensils, Apple, IceCream, Star } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function MealQuickSelector({ meals, onSelectMeal }) {
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const getProteinIcon = (proteinType) => {
    if (!proteinType) return null;
    const type = proteinType.toLowerCase();
    if (type.includes('beef')) return <span className="text-base">🥩</span>;
    if (type.includes('chicken')) return <span className="text-base">🍗</span>;
    if (type.includes('fish')) return <span className="text-base">🐟</span>;
    if (type.includes('beans')) return <span className="text-base">🫘</span>;
    if (type.includes('vegetarian')) return <span className="text-base">🥬</span>;
    if (type.includes('pork')) return <span className="text-base">🍖</span>;
    if (type.includes('turkey')) return <span className="text-base">🦃</span>;
    if (type.includes('eggs')) return <span className="text-base">🥚</span>;
    return null;
  };

  const getMealTypeIcon = (mealType) => {
    if (mealType === 'breakfast') return <Coffee className="w-3.5 h-3.5 text-orange-600" />;
    if (mealType === 'lunch') return <UtensilsCrossed className="w-3.5 h-3.5 text-blue-600" />;
    if (mealType === 'dinner') return <Utensils className="w-3.5 h-3.5 text-indigo-600" />;
    if (mealType === 'snack') return <Apple className="w-3.5 h-3.5 text-green-600" />;
    if (mealType === 'dessert') return <IceCream className="w-3.5 h-3.5 text-pink-500" />;
    return null;
  };

  // Filter meals by selected meal type if one is chosen
  const filteredMeals = selectedMealType
    ? meals.filter(meal => meal.type && meal.type.split(',').map(t => t.trim()).includes(selectedMealType))
    : meals;

  // Sort meals by rating (highest first)
  const sortedMeals = [...filteredMeals].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const handleMealSelect = (meal) => {
    onSelectMeal(meal, selectedMealType);
    setIsOpen(false);
    setSelectedMealType(null);
  };

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setSelectedMealType(null);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-pink-200 text-pink-600 hover:bg-pink-50 h-7 w-7 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        {!selectedMealType ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 mb-2">Select meal type:</p>
            <div className="space-y-1">
              {['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-pink-50 transition-colors text-left"
                >
                  {getMealTypeIcon(type)}
                  <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getMealTypeIcon(selectedMealType)}
                <p className="text-xs font-medium text-gray-700 capitalize">{selectedMealType}</p>
              </div>
              <button
                onClick={() => setSelectedMealType(null)}
                className="text-xs text-pink-600 hover:text-pink-700"
              >
                Back
              </button>
            </div>
            {sortedMeals.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No {selectedMealType} meals found</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {sortedMeals.map(meal => (
                  <button
                    key={meal.id}
                    onClick={() => handleMealSelect(meal)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-pink-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{meal.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {meal.protein_type && (
                          <div className="flex-shrink-0">
                            {getProteinIcon(meal.protein_type)}
                          </div>
                        )}
                        {meal.type && meal.type.split(',').map((t, idx) => (
                          <span key={idx}>{getMealTypeIcon(t.trim())}</span>
                        ))}
                        {meal.rating > 0 && (
                          <div className="flex items-center gap-0.5 ml-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-600">{meal.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
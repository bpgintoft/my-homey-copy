import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Clock, Users, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WeeklyCalendar({ 
  mealPlans, 
  meals, 
  onUpdateMealPlan, 
  onDeleteMealPlan, 
  onAddMealToPlan,
  expandedSections,
  toggleSection 
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [expandedMealId, setExpandedMealId] = useState(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceId = result.draggableId;
    const [destDay, destMealType] = result.destination.droppableId.split('-');

    const mealPlan = mealPlans.find(plan => plan.id === sourceId);
    if (mealPlan && (mealPlan.day_of_week !== destDay || mealPlan.meal_type !== destMealType)) {
      onUpdateMealPlan(mealPlan.id, {
        day_of_week: destDay,
        meal_type: destMealType
      });
    }
  };

  const getMealIcon = (type) => {
    const icons = {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙',
      snack: '🍎'
    };
    return icons[type] || '🍽️';
  };

  const handleAddMeal = () => {
    if (!selectedDay || !selectedMealType || !selectedMeal) return;
    
    onAddMealToPlan({
      day_of_week: selectedDay,
      meal_type: selectedMealType,
      meal_id: selectedMeal.id,
      meal_name: selectedMeal.name
    });
    
    setShowAddDialog(false);
    setSelectedDay('');
    setSelectedMealType('');
    setSelectedMeal(null);
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {days.map((day) => (
            <div key={day} className="min-w-0">
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-t-lg px-3 py-2">
                <h3 className="font-semibold capitalize text-sm lg:text-base truncate">{day}</h3>
              </div>
              <Card className="bg-white border-0 shadow-sm rounded-t-none">
                <CardContent className="p-2 space-y-2">
                  {mealTypes.map((mealType) => {
                    const mealsForSlot = mealPlans.filter(
                      plan => plan.day_of_week === day && plan.meal_type === mealType
                    );

                    return (
                      <Droppable key={`${day}-${mealType}`} droppableId={`${day}-${mealType}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[80px] rounded-lg border-2 border-dashed p-2 transition-colors ${
                              snapshot.isDraggingOver
                                ? 'border-pink-400 bg-pink-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                <span>{getMealIcon(mealType)}</span>
                                <span className="capitalize hidden lg:inline">{mealType}</span>
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedDay(day);
                                  setSelectedMealType(mealType);
                                  setShowAddDialog(true);
                                }}
                                className="text-gray-400 hover:text-pink-600 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            
                            {mealsForSlot.length === 0 ? (
                              <div className="text-xs text-gray-400 text-center py-2">
                                Empty
                              </div>
                            ) : (
                              mealsForSlot.map((plan, index) => {
                                const mealDetails = meals.find(m => m.id === plan.meal_id);
                                const isExpanded = expandedMealId === plan.id;
                                
                                return (
                                  <Draggable key={plan.id} draggableId={plan.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                      >
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className={`bg-white rounded-lg border p-2 mb-1 cursor-move transition-shadow ${
                                            snapshot.isDragging ? 'shadow-lg border-pink-300' : 'border-gray-200 hover:shadow-md'
                                          }`}
                                          onClick={() => setExpandedMealId(isExpanded ? null : plan.id)}
                                        >
                                          <div className="flex items-start justify-between gap-1">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium text-gray-900 truncate">
                                                {plan.meal_name}
                                              </p>
                                              {mealDetails?.cooking_method && (
                                                <p className="text-[10px] text-orange-600 mt-0.5">
                                                  {mealDetails.cooking_method === 'oven' && `${mealDetails.cooking_temperature_or_heat} • ${mealDetails.cook_time}m`}
                                                  {mealDetails.cooking_method === 'stovetop' && `Heat ${mealDetails.cooking_temperature_or_heat}`}
                                                  {mealDetails.cooking_method === 'microwave' && `${mealDetails.cook_time}m`}
                                                </p>
                                              )}
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteMealPlan(plan.id);
                                              }}
                                              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>

                                          {isExpanded && mealDetails && (
                                            <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                                              {mealDetails.photo_url && (
                                                <div className="w-full h-24 rounded overflow-hidden">
                                                  <img 
                                                    src={mealDetails.photo_url} 
                                                    alt={mealDetails.name} 
                                                    className="w-full h-full object-cover" 
                                                  />
                                                </div>
                                              )}
                                              
                                              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                                <Clock className="w-3 h-3" />
                                                {(mealDetails.prep_time || 0) + (mealDetails.cook_time || 0)} min
                                                <Users className="w-3 h-3 ml-1" />
                                                {mealDetails.servings || 4}
                                              </div>

                                              {mealDetails.recipe_url && (
                                                <a
                                                  href={mealDetails.recipe_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="inline-flex items-center gap-1 text-[10px] text-pink-600 hover:text-pink-700 font-medium"
                                                >
                                                  Recipe <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                              )}
                                            </div>
                                          )}
                                        </motion.div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </DragDropContext>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meal to {selectedDay && selectedMealType && `${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} - ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedMeal?.id || ''}
              onValueChange={(value) => setSelectedMeal(meals.find(m => m.id === value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a meal" />
              </SelectTrigger>
              <SelectContent>
                {meals.filter(m => m.kid_friendly).map(meal => (
                  <SelectItem key={meal.id} value={meal.id}>
                    {meal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddMeal}
              disabled={!selectedMeal}
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white"
            >
              Add to Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
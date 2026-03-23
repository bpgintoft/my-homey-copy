import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, Loader2 } from 'lucide-react';

export default function WeeklyNutritionDialog({ open, onOpenChange, calculating, data }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-500" />
            Weekly Nutrition Summary
          </DialogTitle>
        </DialogHeader>
        {calculating ? (
          <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
            Calculating nutrition...
          </div>
        ) : data ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {data.totalMeals} meal{data.totalMeals !== 1 ? 's' : ''} planned
              {data.aiEstimatedCount > 0 ? ` · ${data.aiEstimatedCount} estimated by AI` : ''}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Calories', value: Math.round(data.totals.calories), unit: 'kcal', color: 'text-orange-600' },
                { label: 'Protein', value: Math.round(data.totals.protein_g), unit: 'g', color: 'text-blue-600' },
                { label: 'Carbs', value: Math.round(data.totals.carbs_g), unit: 'g', color: 'text-yellow-600' },
                { label: 'Fat', value: Math.round(data.totals.fat_g), unit: 'g', color: 'text-red-500' },
                { label: 'Fiber', value: Math.round(data.totals.fiber_g), unit: 'g', color: 'text-green-600' },
                { label: 'Sugar', value: Math.round(data.totals.sugar_g), unit: 'g', color: 'text-pink-500' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-400">{unit}</div>
                  <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {data.aiEstimatedCount > 0 && (
              <p className="text-xs text-gray-400 italic">
                * AI estimated nutrition for {data.aiEstimatedCount} meal{data.aiEstimatedCount !== 1 ? 's' : ''} without saved nutrition data
              </p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
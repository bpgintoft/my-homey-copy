import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Wrench, Droplet, Zap, Home, Leaf } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const maintenanceTips = [
  {
    category: 'HVAC',
    icon: Wrench,
    color: 'text-orange-600',
    tips: [
      { task: 'Change air filters', frequency: 'Monthly', description: 'Replace or clean HVAC filters to maintain air quality and system efficiency' },
      { task: 'Schedule professional HVAC service', frequency: 'Bi-annually', description: 'Have your heating and cooling system inspected and serviced twice a year' },
      { task: 'Clear outdoor AC unit', frequency: 'Quarterly', description: 'Remove debris and vegetation around outdoor condenser unit' }
    ]
  },
  {
    category: 'Plumbing',
    icon: Droplet,
    color: 'text-blue-600',
    tips: [
      { task: 'Check for leaks', frequency: 'Monthly', description: 'Inspect under sinks, toilets, and around water heater for any signs of leaks' },
      { task: 'Test sump pump', frequency: 'Quarterly', description: 'Pour water into sump pit to ensure pump activates properly' },
      { task: 'Flush water heater', frequency: 'Annually', description: 'Drain sediment from water heater to improve efficiency' }
    ]
  },
  {
    category: 'Electrical',
    icon: Zap,
    color: 'text-yellow-600',
    tips: [
      { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Press test and reset buttons on GFCI outlets in bathrooms and kitchen' },
      { task: 'Inspect electrical cords', frequency: 'Quarterly', description: 'Check for frayed or damaged cords and replace as needed' },
      { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Press test button and replace batteries as needed' }
    ]
  },
  {
    category: 'Exterior',
    icon: Home,
    color: 'text-green-600',
    tips: [
      { task: 'Clean gutters', frequency: 'Bi-annually', description: 'Remove leaves and debris from gutters and downspouts' },
      { task: 'Inspect roof', frequency: 'Annually', description: 'Check for missing, damaged, or loose shingles' },
      { task: 'Seal windows and doors', frequency: 'Annually', description: 'Check and replace weatherstripping and caulking as needed' }
    ]
  },
  {
    category: 'Landscaping',
    icon: Leaf,
    color: 'text-emerald-600',
    tips: [
      { task: 'Trim trees and shrubs', frequency: 'Seasonally', description: 'Keep vegetation away from house and maintain healthy growth' },
      { task: 'Service lawn equipment', frequency: 'Annually', description: 'Sharpen mower blades, change oil, and tune up before season' },
      { task: 'Check irrigation system', frequency: 'Monthly (during season)', description: 'Inspect for leaks, broken heads, or misaligned sprinklers' }
    ]
  }
];

export default function MaintenanceTips() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Smart Maintenance Tips
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {maintenanceTips.map((section, idx) => {
              const Icon = section.icon;
              const isExpanded = expandedCategories.has(section.category);
              return (
                <div key={idx} className="bg-white rounded-lg border border-emerald-100 overflow-hidden">
                  <button
                    onClick={() => toggleCategory(section.category)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-emerald-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${section.color}`} />
                      <span className="font-medium text-gray-900">{section.category}</span>
                      <span className="text-xs text-gray-500">({section.tips.length} tips)</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2">
                      {section.tips.map((tip, tipIdx) => (
                        <div key={tipIdx} className="pl-8 py-2 border-l-2 border-emerald-200">
                          <div className="flex items-baseline justify-between mb-1">
                            <h4 className="font-medium text-sm text-gray-900">{tip.task}</h4>
                            <span className="text-xs text-emerald-600 font-medium">{tip.frequency}</span>
                          </div>
                          <p className="text-xs text-gray-600">{tip.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
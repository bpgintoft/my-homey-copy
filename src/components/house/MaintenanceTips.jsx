import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Wrench, Droplet, Zap, Home, Leaf, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const getMonthSpecificTips = (monthNumber) => {
  const allTips = {
    hvac: {
      icon: Wrench,
      color: 'text-orange-600',
      tips: {
        0: [{ task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter for winter efficiency', category: 'hvac' }],
        1: [
          { task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter', category: 'hvac' },
          { task: 'Schedule spring AC tune-up', frequency: 'Seasonal', description: 'Get AC serviced before cooling season begins', category: 'hvac' }
        ],
        2: [
          { task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter', category: 'hvac' },
          { task: 'Clean outdoor AC unit', frequency: 'Seasonal', description: 'Remove winter debris from outdoor condenser', category: 'hvac' }
        ],
        3: [
          { task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter for spring', category: 'hvac' },
          { task: 'Test AC system', frequency: 'Seasonal', description: 'Run AC for first time and check for issues', category: 'hvac' }
        ],
        4: [{ task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter', category: 'hvac' }],
        5: [{ task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter for peak cooling season', category: 'hvac' }],
        6: [{ task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter during heavy use', category: 'hvac' }],
        7: [
          { task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter', category: 'hvac' },
          { task: 'Schedule fall furnace tune-up', frequency: 'Seasonal', description: 'Get heating system serviced before winter', category: 'hvac' }
        ],
        8: [
          { task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter', category: 'hvac' },
          { task: 'Clean furnace area', frequency: 'Seasonal', description: 'Remove dust and debris around furnace', category: 'hvac' }
        ],
        9: [
          { task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter', category: 'hvac' },
          { task: 'Test furnace system', frequency: 'Seasonal', description: 'Run heat for first time and check for issues', category: 'hvac' }
        ],
        10: [{ task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter', category: 'hvac' }],
        11: [{ task: 'Change air filter', frequency: 'Monthly', description: 'Replace HVAC filter for winter', category: 'hvac' }]
      }
    },
    plumbing: {
      icon: Droplet,
      color: 'text-blue-600',
      tips: {
        0: [
          { task: 'Check for frozen pipes', frequency: 'Monthly', description: 'Inspect exposed pipes in cold areas', category: 'plumbing' },
          { task: 'Drain outdoor faucets', frequency: 'Seasonal', description: 'Prevent freeze damage to exterior spigots', category: 'plumbing' }
        ],
        1: [{ task: 'Check for leaks', frequency: 'Monthly', description: 'Inspect under sinks and around water heater', category: 'plumbing' }],
        2: [
          { task: 'Check for leaks', frequency: 'Monthly', description: 'Inspect plumbing for winter damage', category: 'plumbing' },
          { task: 'Test sump pump', frequency: 'Seasonal', description: 'Prepare for spring thaw and rain', category: 'plumbing' }
        ],
        3: [
          { task: 'Check for leaks', frequency: 'Monthly', description: 'Spring plumbing inspection', category: 'plumbing' },
          { task: 'Flush water heater', frequency: 'Annual', description: 'Drain sediment to improve efficiency', category: 'plumbing' }
        ],
        4: [
          { task: 'Check for leaks', frequency: 'Monthly', description: 'Inspect all plumbing fixtures', category: 'plumbing' },
          { task: 'Check outdoor faucets', frequency: 'Seasonal', description: 'Test and repair outdoor spigots for summer', category: 'plumbing' }
        ],
        5: [{ task: 'Check for leaks', frequency: 'Monthly', description: 'Summer plumbing check', category: 'plumbing' }],
        6: [{ task: 'Check for leaks', frequency: 'Monthly', description: 'Inspect all fixtures', category: 'plumbing' }],
        7: [{ task: 'Check for leaks', frequency: 'Monthly', description: 'Late summer plumbing inspection', category: 'plumbing' }],
        8: [
          { task: 'Check for leaks', frequency: 'Monthly', description: 'Fall plumbing check', category: 'plumbing' },
          { task: 'Test sump pump', frequency: 'Seasonal', description: 'Prepare for fall rains', category: 'plumbing' }
        ],
        9: [{ task: 'Check for leaks', frequency: 'Monthly', description: 'Pre-winter plumbing inspection', category: 'plumbing' }],
        10: [
          { task: 'Check for leaks', frequency: 'Monthly', description: 'Inspect all plumbing', category: 'plumbing' },
          { task: 'Insulate exposed pipes', frequency: 'Seasonal', description: 'Prepare pipes for freezing temperatures', category: 'plumbing' }
        ],
        11: [
          { task: 'Check for leaks', frequency: 'Monthly', description: 'Winter plumbing check', category: 'plumbing' },
          { task: 'Winterize outdoor faucets', frequency: 'Seasonal', description: 'Disconnect hoses and shut off outdoor water', category: 'plumbing' }
        ]
      }
    },
    electrical: {
      icon: Zap,
      color: 'text-yellow-600',
      tips: {
        0: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Press test button on all detectors', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Check bathroom and kitchen outlets', category: 'electrical' }
        ],
        1: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Test and replace batteries if needed', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Ensure safety outlets function properly', category: 'electrical' }
        ],
        2: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Spring safety check', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Test all GFCI outlets', category: 'electrical' },
          { task: 'Replace smoke detector batteries', frequency: 'Semi-annual', description: 'Change batteries in all smoke detectors', category: 'safety' }
        ],
        3: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Monthly safety test', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Check all safety outlets', category: 'electrical' }
        ],
        4: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Test all detectors', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Monthly GFCI test', category: 'electrical' }
        ],
        5: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Summer safety check', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Test outdoor and indoor GFCIs', category: 'electrical' }
        ],
        6: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Monthly detector test', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Test all safety outlets', category: 'electrical' }
        ],
        7: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Late summer safety check', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Check all GFCIs', category: 'electrical' }
        ],
        8: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Fall safety inspection', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Test all safety outlets', category: 'electrical' },
          { task: 'Replace smoke detector batteries', frequency: 'Semi-annual', description: 'Fall battery replacement', category: 'safety' }
        ],
        9: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Pre-winter safety check', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Monthly GFCI test', category: 'electrical' }
        ],
        10: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Monthly safety test', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Test all outlets', category: 'electrical' }
        ],
        11: [
          { task: 'Test smoke & CO detectors', frequency: 'Monthly', description: 'Holiday season safety check', category: 'electrical' },
          { task: 'Test GFCI outlets', frequency: 'Monthly', description: 'Winter GFCI test', category: 'electrical' }
        ]
      }
    },
    exterior: {
      icon: Home,
      color: 'text-green-600',
      tips: {
        0: [{ task: 'Check for ice dams', frequency: 'Monthly', description: 'Inspect roof and gutters for ice buildup', category: 'exterior' }],
        1: [{ task: 'Inspect siding', frequency: 'Seasonal', description: 'Check for winter damage to exterior walls', category: 'exterior' }],
        2: [
          { task: 'Inspect roof', frequency: 'Seasonal', description: 'Check for winter damage to shingles', category: 'exterior' },
          { task: 'Clean gutters', frequency: 'Seasonal', description: 'Remove winter debris from gutters', category: 'exterior' }
        ],
        3: [
          { task: 'Clean gutters', frequency: 'Seasonal', description: 'Spring gutter cleaning', category: 'exterior' },
          { task: 'Inspect foundation', frequency: 'Seasonal', description: 'Check for cracks from freeze-thaw', category: 'exterior' }
        ],
        4: [
          { task: 'Seal windows and doors', frequency: 'Annual', description: 'Check and replace weatherstripping', category: 'exterior' },
          { task: 'Inspect deck or patio', frequency: 'Seasonal', description: 'Check for loose boards or damage', category: 'exterior' }
        ],
        5: [{ task: 'Power wash siding', frequency: 'Annual', description: 'Clean exterior walls and surfaces', category: 'exterior' }],
        6: [{ task: 'Inspect exterior paint', frequency: 'Seasonal', description: 'Check for peeling or fading paint', category: 'exterior' }],
        7: [{ task: 'Check driveway and walkways', frequency: 'Seasonal', description: 'Inspect for cracks needing repair', category: 'exterior' }],
        8: [
          { task: 'Inspect roof', frequency: 'Seasonal', description: 'Fall roof inspection', category: 'exterior' },
          { task: 'Clean gutters', frequency: 'Seasonal', description: 'Remove fall leaves from gutters', category: 'exterior' }
        ],
        9: [
          { task: 'Clean gutters', frequency: 'Seasonal', description: 'Final fall gutter cleaning', category: 'exterior' },
          { task: 'Inspect chimney', frequency: 'Annual', description: 'Check chimney before heating season', category: 'exterior' }
        ],
        10: [
          { task: 'Winterize outdoor items', frequency: 'Seasonal', description: 'Store patio furniture and equipment', category: 'exterior' },
          { task: 'Check weatherstripping', frequency: 'Seasonal', description: 'Seal drafts before winter', category: 'exterior' }
        ],
        11: [{ task: 'Inspect exterior lighting', frequency: 'Seasonal', description: 'Check holiday and security lights', category: 'exterior' }]
      }
    },
    landscaping: {
      icon: Leaf,
      color: 'text-emerald-600',
      tips: {
        0: [{ task: 'Prune dormant trees', frequency: 'Seasonal', description: 'Trim trees while dormant', category: 'landscaping' }],
        1: [{ task: 'Plan spring garden', frequency: 'Seasonal', description: 'Order seeds and plan plantings', category: 'landscaping' }],
        2: [
          { task: 'Rake winter debris', frequency: 'Seasonal', description: 'Clear lawn of branches and debris', category: 'landscaping' },
          { task: 'Service lawn equipment', frequency: 'Annual', description: 'Tune up mower and tools', category: 'landscaping' }
        ],
        3: [
          { task: 'Fertilize lawn', frequency: 'Seasonal', description: 'Apply spring fertilizer', category: 'landscaping' },
          { task: 'Start spring planting', frequency: 'Seasonal', description: 'Plant cool-season crops and flowers', category: 'landscaping' }
        ],
        4: [
          { task: 'Check irrigation system', frequency: 'Seasonal', description: 'Turn on and test sprinkler system', category: 'landscaping' },
          { task: 'Mulch garden beds', frequency: 'Seasonal', description: 'Add fresh mulch to beds', category: 'landscaping' }
        ],
        5: [
          { task: 'Weed and maintain garden', frequency: 'Monthly', description: 'Remove weeds and maintain plantings', category: 'landscaping' },
          { task: 'Monitor irrigation', frequency: 'Monthly', description: 'Check for leaks and adjust watering', category: 'landscaping' }
        ],
        6: [
          { task: 'Mow and edge regularly', frequency: 'Weekly', description: 'Maintain lawn during peak growth', category: 'landscaping' },
          { task: 'Water deeply', frequency: 'Weekly', description: 'Deep water during hot summer', category: 'landscaping' }
        ],
        7: [
          { task: 'Continue watering', frequency: 'Weekly', description: 'Maintain irrigation schedule', category: 'landscaping' },
          { task: 'Deadhead flowers', frequency: 'Monthly', description: 'Remove spent blooms', category: 'landscaping' }
        ],
        8: [
          { task: 'Aerate lawn', frequency: 'Annual', description: 'Fall lawn aeration', category: 'landscaping' },
          { task: 'Overseed lawn', frequency: 'Annual', description: 'Reseed thin areas', category: 'landscaping' }
        ],
        9: [
          { task: 'Plant fall bulbs', frequency: 'Seasonal', description: 'Plant spring-flowering bulbs', category: 'landscaping' },
          { task: 'Fertilize lawn', frequency: 'Seasonal', description: 'Apply fall fertilizer', category: 'landscaping' }
        ],
        10: [
          { task: 'Final mowing', frequency: 'Seasonal', description: 'Last lawn cut of season', category: 'landscaping' },
          { task: 'Winterize irrigation', frequency: 'Annual', description: 'Blow out sprinkler system', category: 'landscaping' }
        ],
        11: [
          { task: 'Store garden tools', frequency: 'Seasonal', description: 'Clean and store equipment', category: 'landscaping' },
          { task: 'Protect sensitive plants', frequency: 'Seasonal', description: 'Cover or move tender plants', category: 'landscaping' }
        ]
      }
    }
  };

  return Object.entries(allTips).map(([key, data]) => ({
    category: key.charAt(0).toUpperCase() + key.slice(1),
    icon: data.icon,
    color: data.color,
    tips: data.tips[monthNumber] || []
  }));
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MaintenanceTips({ onAddTask }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const maintenanceTips = useMemo(() => getMonthSpecificTips(selectedMonth), [selectedMonth]);

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
          {isOpen && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
              <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
                      {section.tips.length > 0 ? (
                        section.tips.map((tip, tipIdx) => (
                          <div key={tipIdx} className="pl-8 py-2 border-l-2 border-emerald-200">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div className="flex-1">
                                <div className="flex items-baseline justify-between mb-1">
                                  <h4 className="font-medium text-sm text-gray-900">{tip.task}</h4>
                                  <span className="text-xs text-emerald-600 font-medium whitespace-nowrap ml-2">{tip.frequency}</span>
                                </div>
                                <p className="text-xs text-gray-600">{tip.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddTask(tip);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="px-4 py-2 text-xs text-gray-500 italic">No specific tips for this month</p>
                      )}
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
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { History as HistoryIcon, Home as HomeIcon, DollarSign, TrendingUp, Calendar, Ruler } from 'lucide-react';
import { motion } from 'framer-motion';

export default function History() {
  const { data: homeInfo } = useQuery({
    queryKey: ['homeInfo'],
    queryFn: () => base44.entities.HomeInfo.list(),
  });

  const { data: propertyData, isLoading: propertyLoading } = useQuery({
    queryKey: ['propertyData'],
    queryFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Get property data from this Redfin page: https://www.redfin.com/WI/Milwaukee/1934-Church-St-53213/home/90306414. Extract the Redfin estimate, bedrooms, bathrooms, square footage, lot size, year built, and any sale history shown on the page.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            estimated_value: { type: "number" },
            bedrooms: { type: "number" },
            bathrooms: { type: "number" },
            square_footage: { type: "number" },
            lot_size: { type: "string" },
            year_built: { type: "number" },
            last_sale_date: { type: "string" },
            last_sale_price: { type: "number" },
            data_source: { type: "string" }
          }
        }
      });
      return result;
    },
    staleTime: 1000 * 60 * 60,
  });

  const home = homeInfo?.[0];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="bg-gradient-to-r from-[#FFB800] to-[#E5A200] text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-3">
            <HistoryIcon className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Property History</h1>
          </div>
          <p className="text-white/90 text-lg">1934 Church St, Wauwatosa, WI 53213</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Property Value */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Redfin Estimate</h2>
                  <p className="text-sm text-gray-500">Current property value</p>
                </div>
              </div>
              
              {propertyLoading ? (
                <div className="animate-pulse">
                  <div className="h-12 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
              ) : (
                <>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {propertyData?.estimated_value 
                      ? `$${propertyData.estimated_value.toLocaleString()}`
                      : 'Value not available'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    Updated from Redfin.com
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Property Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Property Details</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Bedrooms</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {propertyData?.bedrooms || home?.bedrooms || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Bathrooms</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {propertyData?.bathrooms || home?.bathrooms || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Year Built</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {propertyData?.year_built || home?.year_built || '1927'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Square Footage</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {propertyData?.square_footage?.toLocaleString() || home?.square_footage?.toLocaleString() || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Lot Size</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {propertyData?.lot_size || home?.lot_size || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Stories</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {home?.stories || '—'}
                  </div>
                </div>
              </div>

              {home?.architectural_style && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Architectural Style</div>
                  <div className="text-lg font-semibold text-gray-900">{home.architectural_style}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sale History */}
        {propertyData?.last_sale_date && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Sale History</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Last Sale Date</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-lg font-semibold text-gray-900">
                        {new Date(propertyData.last_sale_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Sale Price</div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${propertyData.last_sale_price?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Home Story */}
        {home?.history_story && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Home Story</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {home.history_story}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Previous Owners */}
        {home?.previous_owners && home.previous_owners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Previous Owners</h2>
                <div className="space-y-4">
                  {home.previous_owners.map((owner, i) => (
                    <div key={i} className="border-l-4 border-amber-400 pl-4">
                      <div className="font-semibold text-gray-900">{owner.name}</div>
                      {owner.years && <div className="text-sm text-gray-600">{owner.years}</div>}
                      {owner.notes && <div className="text-sm text-gray-500 mt-1">{owner.notes}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notable Events */}
        {home?.notable_events && home.notable_events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Notable Events</h2>
                <div className="space-y-3">
                  {home.notable_events.map((event, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-16 text-right">
                        <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm font-semibold">
                          {event.year}
                        </span>
                      </div>
                      <div className="flex-1 text-gray-700">{event.event}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
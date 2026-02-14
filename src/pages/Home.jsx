import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Home as HomeIcon, 
  History, 
  Wrench, 
  Users, 
  Palette,
  CalendarDays,
  ArrowRight,
  Sparkles,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';

export default function Home() {
  const { data: homeInfo } = useQuery({
    queryKey: ['homeInfo'],
    queryFn: () => base44.entities.HomeInfo.list(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.MaintenanceTask.list(),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
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
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const home = homeInfo?.[0];
  const upcomingTasks = tasks?.filter(t => t.status !== 'completed').slice(0, 3) || [];

  const quickLinks = [
    { title: 'History', description: 'Explore your home\'s story', icon: History, href: 'History', color: 'from-amber-500 to-orange-600' },
    { title: 'Rooms', description: 'Manage every space', icon: HomeIcon, href: 'Rooms', color: 'from-blue-500 to-indigo-600' },
    { title: 'Maintenance', description: 'Keep everything running', icon: Wrench, href: 'Maintenance', color: 'from-emerald-500 to-teal-600' },
    { title: 'Vendors', description: 'Your trusted contacts', icon: Users, href: 'Vendors', color: 'from-purple-500 to-pink-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-800/80 z-10" />
        <div 
          className="h-[40vh] min-h-[320px] bg-cover bg-center"
          style={{ 
            backgroundImage: home?.photo_url 
              ? `url(${home.photo_url})` 
              : 'url(https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600)'
          }}
        />
        <div className="absolute inset-0 z-20 flex items-center">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 text-amber-400 mb-3">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-medium tracking-wide uppercase">Welcome Home</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                1934 Church St.
              </h1>
              <p className="text-xl text-slate-300">
                Wauwatosa, WI 53213
              </p>
              {home?.year_built && (
                <p className="text-slate-400 mt-2">
                  Built {home.year_built} • {home.architectural_style || 'Classic American Home'}
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="container mx-auto px-6 -mt-12 relative z-30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Redfin Value', value: propertyData?.estimated_value ? `$${propertyData.estimated_value.toLocaleString()}` : '—', loading: propertyLoading },
            { label: 'Rooms', value: rooms?.length || 0 },
            { label: 'Tasks Due', value: upcomingTasks.length },
            { label: 'Sq. Ft.', value: propertyData?.square_footage?.toLocaleString() || home?.square_footage?.toLocaleString() || '—', loading: propertyLoading },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4 text-center">
                  {stat.loading ? (
                    <>
                      <div className="h-8 w-20 mx-auto bg-slate-200 rounded animate-pulse mb-1" />
                      <div className="text-sm text-slate-500">{stat.label}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                      <div className="text-sm text-slate-500">{stat.label}</div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="container mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">Quick Access</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            >
              <Link to={createPageUrl(link.href)}>
                <Card className="group cursor-pointer border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-0">
                    <div className={`h-2 bg-gradient-to-r ${link.color}`} />
                    <div className="p-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${link.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <link.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">{link.title}</h3>
                      <p className="text-sm text-slate-500 mb-3">{link.description}</p>
                      <div className="flex items-center text-sm font-medium text-slate-600 group-hover:text-slate-900">
                        Explore <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Upcoming Tasks Preview */}
      {upcomingTasks.length > 0 && (
        <div className="container mx-auto px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-800">Upcoming Tasks</h2>
            <Link to={createPageUrl('Maintenance')} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {upcomingTasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              >
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
                          task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {task.priority}
                        </span>
                        <h4 className="font-medium text-slate-800">{task.title}</h4>
                        <p className="text-sm text-slate-500 mt-1">{task.category}</p>
                      </div>
                      {task.next_due && (
                        <div className="flex items-center text-xs text-slate-400">
                          <CalendarDays className="w-3 h-3 mr-1" />
                          {new Date(task.next_due).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { addDays } from 'date-fns';
import { 
  Home, 
  UtensilsCrossed,
  Calendar,
  History,
  Menu, 
  CheckSquare,
  Users,
  Settings
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from 'framer-motion';


// Data prefetchers for the most-used pages — called on nav link hover
const prefetchMap = {
  Calendar: (queryClient) => {
    // Prefetch cached calendar events from DB (instant, no API call)
    queryClient.prefetchQuery({
      queryKey: ['cachedCalendarEvents'],
      queryFn: () => base44.entities.CachedCalendarEvent.list('-start', 500),
      staleTime: 15 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['kidsActivities'],
      queryFn: () => base44.entities.KidsActivity.list('-date', 200),
      staleTime: 2 * 60 * 1000,
    });
  },
  Meals: (queryClient) => {
    queryClient.prefetchQuery({
      queryKey: ['meals'],
      queryFn: () => base44.entities.Meal.list('-updated_date', 100),
      staleTime: 2 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['mealPlans'],
      queryFn: () => base44.entities.MealPlan.list('-week_start_date', 50),
      staleTime: 2 * 60 * 1000,
    });
  },
  House: (queryClient) => {
    queryClient.prefetchQuery({
      queryKey: ['rooms'],
      queryFn: () => base44.entities.Room.list(),
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['appliances'],
      queryFn: () => base44.entities.RoomItem.list(),
      staleTime: 5 * 60 * 1000,
    });
  },
};

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const mainRef = useRef(null);

  const isCalendarPage = ['MaintenanceCalendar', 'FamilyCalendar', 'Calendar'].includes(currentPageName);

  const handleTouchStart = useCallback((e) => {
    if (isCalendarPage) return;
    const el = mainRef.current;
    if (el && el.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  }, [isCalendarPage]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartY.current) return;
    const dist = e.touches[0].clientY - touchStartY.current;
    if (dist > 0) {
      setPullDistance(Math.min(dist * 0.4, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setTimeout(() => window.location.reload(), 300);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance]);

  const navGroups = [
    {
      label: 'Home',
      items: [
        { name: 'Home', icon: Home, href: 'Home' },
        { name: 'Meals', icon: UtensilsCrossed, href: 'Meals' },
        { name: 'Calendar', icon: Calendar, href: 'Calendar' },
        { name: 'House', icon: Home, href: 'House' },
        { name: 'History', icon: History, href: 'History' },
        { name: 'Decisions', icon: CheckSquare, href: 'Decisions' },
        { name: 'Settings', icon: Settings, href: 'Settings' },
      ],
    },
    {
      label: 'Family',
      items: [
        { name: 'Bryan', icon: Users, href: 'Bryan' },
        { name: 'Kate', icon: Users, href: 'Kate' },
        { name: 'Phoenix', icon: Users, href: 'Phoenix' },
        { name: 'Mara', icon: Users, href: 'Mara' },
      ],
    },
  ];

  const navItems = navGroups.flatMap(g => g.items);

  const NavLink = ({ item, mobile = false }) => {
    const isActive = currentPageName === item.href;
    
    return (
      <Link
        to={createPageUrl(item.href)}
        onClick={() => mobile && setMobileOpen(false)}
        onMouseEnter={() => prefetchMap[item.href]?.(queryClient)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          isActive 
            ? 'bg-gray-900 text-white' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${mobile ? 'w-full' : ''}`}
      >
        <item.icon className="w-5 h-5" />
        <span className="font-medium">{item.name}</span>
      </Link>
    );
  };

  const NavGroup = ({ group, mobile = false }) => (
    <div className="mb-4">
      <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
      {group.items.map(item => (
        <NavLink key={item.name} item={item} mobile={mobile} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex-col z-40">
        <div className="p-6 border-b border-gray-100">
          <Link to={createPageUrl('Home')} onClick={() => currentPageName === 'Home' && window.location.reload()} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">The Gintoft Family</h1>
              <p className="text-xs text-gray-500">Family Home</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4">
          {navGroups.map(group => (
            <NavGroup key={group.label} group={group} />
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <Link to={createPageUrl('Home')} onClick={() => currentPageName === 'Home' && window.location.reload()} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">The Gintoft Family</span>
        </Link>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0 bg-white">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">The Gintoft Family</h1>
                  <p className="text-xs text-gray-500">Wauwatosa, WI</p>
                </div>
              </div>
            </div>
            <nav className="p-4">
              {navGroups.map(group => (
                <NavGroup key={group.label} group={group} mobile />
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main
        ref={mainRef}
        className="lg:ml-64 pt-16 lg:pt-0 overflow-y-auto h-screen"
      >
        {/* Pull to refresh indicator */}
        <div
          style={{ height: pullDistance, opacity: pullDistance / 80 }}
          className="flex items-center justify-center transition-all overflow-hidden"
        >
          <div className={`w-7 h-7 rounded-full border-2 border-gray-400 border-t-transparent ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
        <div>
          {children}
        </div>
      </main>

    </div>
  );
}
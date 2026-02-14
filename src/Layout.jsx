import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Home, 
  History, 
  LayoutGrid, 
  Wrench, 
  Users, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { name: 'Home', icon: Home, href: 'Home' },
    { name: 'History', icon: History, href: 'History' },
    { name: 'Rooms', icon: LayoutGrid, href: 'Rooms' },
    { name: 'Maintenance', icon: Wrench, href: 'Maintenance' },
    { name: 'Vendors', icon: Users, href: 'Vendors' },
  ];

  const NavLink = ({ item, mobile = false }) => {
    const isActive = currentPageName === item.href || 
      (item.href === 'Rooms' && currentPageName === 'RoomDetail');
    
    return (
      <Link
        to={createPageUrl(item.href)}
        onClick={() => mobile && setMobileOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          isActive 
            ? 'bg-slate-800 text-white' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        } ${mobile ? 'w-full' : ''}`}
      >
        <item.icon className="w-5 h-5" />
        <span className="font-medium">{item.name}</span>
        {mobile && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-40">
        <div className="p-6 border-b border-slate-100">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">1934 Church</h1>
              <p className="text-xs text-slate-500">Home Manager</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="text-xs text-slate-400 text-center">
            Wauwatosa, WI 53213
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <Link to={createPageUrl('Home')} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800">1934 Church</span>
        </Link>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-800">1934 Church St.</h1>
                  <p className="text-xs text-slate-500">Wauwatosa, WI</p>
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map(item => (
                <NavLink key={item.name} item={item} mobile />
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPageName}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
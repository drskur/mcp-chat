'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

export const FloatingSidebarTrigger = () => {
  const { open, toggleSidebar } = useSidebar();
  
  if (open) {
    return null;
  }
  
  return (
    <div className="fixed top-4 left-4 z-50 md:flex hidden group/trigger">
      <Button 
        size="icon" 
        variant="outline" 
        className="rounded-full w-10 h-10 bg-indigo-600 border-none hover:bg-indigo-700 text-white shadow-lg"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="absolute left-12 top-2.5 opacity-0 group-hover/trigger:opacity-100 transition-opacity bg-indigo-600 px-3 py-1.5 rounded text-xs text-white whitespace-nowrap shadow-lg">
        메뉴 열기 (⌘+B)
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Activity, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface SidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  appName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItem,
  onItemClick,
  header,
  footer,
  className,
  appName = 'MedConnect AI',
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const handleItemSelect = (id: string) => {
    onItemClick(id);
    setIsOpenMobile(false);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Logo and Brand */}
        {header ? (
          header
        ) : (
          <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                  {appName}
                </span>
                <span className="block text-[10px] uppercase font-semibold tracking-wider text-cyan-400">
                  Healthcare System
                </span>
              </div>
            </div>
            {/* Close button inside mobile drawer */}
            <button
              type="button"
              onClick={() => setIsOpenMobile(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation items */}
        <nav className="p-4 space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemSelect(item.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group text-left',
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                )}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0 transition-colors',
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'ml-2 px-2 py-0.5 text-xs rounded-full font-semibold shrink-0 transition-colors',
                      isActive
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-white/10 text-slate-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-300'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-white/10 bg-black/20">
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Top Toggle Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-white shadow-md">
            <Activity className="w-4 h-4" />
          </div>
          <span className="font-semibold text-white tracking-tight text-base">
            {appName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out',
          'bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl',
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-screen sticky top-0',
          'bg-slate-900/50 backdrop-blur-xl border-r border-white/10 select-none',
          className
        )}
      >
        {navContent}
      </aside>
    </>
  );
};

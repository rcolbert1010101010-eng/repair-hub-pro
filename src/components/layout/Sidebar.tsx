import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  Wrench,
  ShoppingCart,
  Package,
  Building2,
  Tags,
  Settings,
  ChevronLeft,
  Menu,
  HardHat,
  ClipboardList,
  Sun,
  Moon,
  ListChecks,
  BarChart2,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/units', label: 'Units', icon: Truck },
  { path: '/work-orders', label: 'Work Orders', icon: Wrench },
  { path: '/sales-orders', label: 'Sales Orders', icon: ShoppingCart },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/cycle-counts', label: 'Cycle Counts', icon: ListChecks },
  { path: '/plasma', label: 'Plasma Projects', icon: Flame },
  { path: '/plasma/templates', label: 'Plasma Templates', icon: Flame },
  { path: '/technicians', label: 'Technicians', icon: HardHat },
  { path: '/vendors', label: 'Vendors', icon: Building2 },
  { path: '/categories', label: 'Categories', icon: Tags },
  { path: '/reports/returns-warranty', label: 'Returns & Warranty', icon: BarChart2 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [darkSidebar, setDarkSidebar] = useState(true);

  const sidebarColors = darkSidebar
    ? {
        bg: 'bg-[hsl(222,22%,8%)]',
        border: 'border-[hsl(222,15%,20%)]',
        text: 'text-[hsl(0,0%,85%)]',
        textMuted: 'text-[hsl(0,0%,60%)]',
        hover: 'hover:bg-[hsl(222,20%,18%)] hover:text-[hsl(0,0%,95%)]',
        active: 'bg-primary text-primary-foreground',
      }
    : {
        bg: 'bg-card',
        border: 'border-border',
        text: 'text-foreground',
        textMuted: 'text-muted-foreground',
        hover: 'hover:bg-accent hover:text-accent-foreground',
        active: 'bg-primary text-primary-foreground',
      };

  return (
    <>
      {/* Floating toggle when collapsed */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-4 z-50 bg-card shadow-md border border-border hover:bg-accent"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      <aside
        className={cn(
          'h-screen flex flex-col transition-all duration-300',
          sidebarColors.bg,
          sidebarColors.border,
          'border-r',
          collapsed ? 'w-0 overflow-hidden' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn('h-16 flex items-center justify-between px-4 border-b', sidebarColors.border)}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className={cn('font-semibold', sidebarColors.text)}>ShopPro</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className={cn('p-1.5 rounded-md transition-colors', sidebarColors.text, sidebarColors.hover)}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive ? sidebarColors.active : cn(sidebarColors.text, sidebarColors.hover)
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer with Toggles */}
        <div className={cn('p-4 border-t flex items-center justify-between', sidebarColors.border)}>
          <p className={cn('text-xs', sidebarColors.textMuted)}>
            Heavy-Duty Repair
          </p>
          <div className="flex items-center gap-1">
            {/* Sidebar theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkSidebar(!darkSidebar)}
              className={cn('h-8 w-8', sidebarColors.text, sidebarColors.hover)}
              title={darkSidebar ? 'Switch to light sidebar' : 'Switch to dark sidebar'}
            >
              {darkSidebar ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* App theme toggle */}
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}

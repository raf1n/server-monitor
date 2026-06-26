
import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  Cpu,
  LayoutDashboard,
  Server,
  Settings,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'servers', label: 'Servers', icon: Server },
  { id: 'processes', label: 'Processes', icon: Workflow },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
  alertCount?: number;
}

export function Sidebar({ active, onNavigate, alertCount = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Activity className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">Server Monitor</span>
            <span className="text-[11px] text-muted-foreground">v2.4.1</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'ml-auto h-8 w-8 text-muted-foreground hover:text-foreground',
            collapsed && 'rotate-180'
          )}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const badge = item.id === 'alerts' ? alertCount : item.badge;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!collapsed && badge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
              {collapsed && badge ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <Separator className="mb-4" />
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5',
            collapsed && 'justify-center'
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Cpu className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-foreground">Agent v3.2</span>
              <span className="text-[11px] text-muted-foreground">Reporting active</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

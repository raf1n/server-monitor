import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAppSelector } from "@/store";
import { selectUnacknowledgedCount } from "@/features/alerts/alertsSelectors";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Key,
  LayoutDashboard,
  Server,
  Settings,
  User,
  Waypoints,
  Workflow,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/servers", label: "Servers", icon: Server },
  { to: "/processes", label: "Processes", icon: Workflow },
  { to: "/ports", label: "Ports", icon: Waypoints },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/api-keys", label: "API Keys", icon: Key },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileToggle }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const alertCount = useAppSelector(selectUnacknowledgedCount);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileToggle} />
      )}

      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-60",
          "fixed inset-y-0 left-0 z-50 -translate-x-full lg:static lg:z-auto lg:translate-x-0",
          mobileOpen && "translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-3">
          {!collapsed && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Activity className="h-5 w-5" />
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">Server Monitor</span>
              <span className="text-[11px] text-muted-foreground">{__APP_VERSION__}</span>
            </div>
          )}
          <div className={cn("flex items-center gap-1", collapsed ? "mx-auto" : "ml-auto")}>
            {onMobileToggle && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
                onClick={onMobileToggle}
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground hover:text-foreground",
                collapsed && "bg-accent text-foreground",
              )}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const badge = item.to === "/alerts" ? alertCount : undefined;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileToggle}
                className={({ isActive }) =>
                  cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center",
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && badge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
                {collapsed && badge ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <Separator className="mb-4" />
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5",
              collapsed && "justify-center",
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Cpu className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-muted-foreground">Reporting active</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

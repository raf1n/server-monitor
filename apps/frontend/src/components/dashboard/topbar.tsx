import { useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Clock,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIME_RANGE_LABELS, TIME_RANGE_SHORT } from "@/lib/types";
import type { ServerInfo, ServerStatus, TimeRange, AlertEvent } from "@/lib/types";
import type { ConnectionState } from "@/hooks/use-stats";
import { api } from "@/lib/api";

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

interface TopbarProps {
  servers: ServerInfo[];
  selectedServerId: string;
  onServerChange: (id: string) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  connection: ConnectionState;
  onReconnect: () => void;
  onToggleSidebar?: () => void;
  alertCount: number;
  alerts?: AlertEvent[];
  onAcknowledgeAlert?: (id: string) => void;
  onAcknowledgeAll?: () => void;
  onLogout?: () => void;
  username?: string;
  email?: string | null;
  role?: string;
  onNavigate?: (id: string) => void;
}

const STATUS_META: Record<
  ServerStatus,
  { label: string; dot: string; text: string }
> = {
  online: { label: "Online", dot: "bg-success", text: "text-success" },
  offline: {
    label: "Offline",
    dot: "bg-destructive",
    text: "text-destructive",
  },
  degraded: { label: "Degraded", dot: "bg-warning", text: "text-warning" },
};

const CONNECTION_META: Record<ConnectionState, { label: string; dot: string }> =
  {
    connected: { label: "Live", dot: "bg-success" },
    demo: { label: "Demo", dot: "bg-primary" },
    connecting: { label: "Connecting", dot: "bg-warning animate-pulse-dot" },
    disconnected: { label: "Offline", dot: "bg-destructive" },
  };

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Topbar({
  servers,
  selectedServerId,
  onServerChange,
  timeRange,
  onTimeRangeChange,
  connection,
  onReconnect,
  onToggleSidebar,
  alertCount,
  alerts = [],
  onAcknowledgeAlert,
  onAcknowledgeAll,
  onLogout,
  username,
  email,
  role,
  onNavigate,
}: TopbarProps) {
  const selectedServer =
    servers.find((s) => s.id === selectedServerId) ?? servers[0];
  const statusMeta = selectedServer
    ? STATUS_META[selectedServer.status]
    : STATUS_META.online;
  const connMeta = CONNECTION_META[connection];

  const hasApi = API_HOST !== undefined;
  const unacked = alerts.filter((a) => !a.acknowledged);
  const recent = [...unacked].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur-md md:gap-3 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={onToggleSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex min-w-0 items-center gap-2">
        <Select value={selectedServerId} onValueChange={onServerChange}>
          <SelectTrigger className="h-9 w-[140px] border-border bg-secondary/50 text-sm sm:w-[180px] md:w-[220px]">
            <div className="flex items-center gap-2 truncate">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", statusMeta.dot)}
              />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {servers.map((server) => {
              const meta = STATUS_META[server.status];
              return (
                <SelectItem key={server.id} value={server.id}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                    <span className="font-medium">{server.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {server.region}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 sm:flex">
          <span className={cn("h-2 w-2 rounded-full", statusMeta.dot)} />
          <span className={cn("text-xs font-medium", statusMeta.text)}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      <div className="relative ml-auto hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search metrics, hosts, processes..."
          className="h-9 w-56 border-border bg-secondary/50 pl-9 text-sm lg:w-64"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-2 md:gap-2">
        <div className="hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 lg:flex">
          <span className={cn("h-2 w-2 rounded-full", connMeta.dot)} />
          <span className="text-xs font-medium text-muted-foreground">
            {connMeta.label}
          </span>
        </div>

        <Select
          value={timeRange}
          onValueChange={(v) => onTimeRangeChange(v as TimeRange)}
        >
          <SelectTrigger className="h-9 w-[90px] border-border bg-secondary/50 text-xs sm:w-[110px] md:w-[130px] md:text-sm">
            <Clock className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground md:mr-1.5 md:h-4 md:w-4" />
            <SelectValue>{TIME_RANGE_SHORT[timeRange]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
              <SelectItem key={r} value={r}>
                {TIME_RANGE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-border bg-secondary/50"
          onClick={onReconnect}
          aria-label="Reconnect"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-9 w-9 border-border bg-secondary/50"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {alertCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-[10px]">
                {unacked.length} new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recent.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No unacknowledged alerts
              </div>
            ) : (
              recent.map((alert) => (
                <DropdownMenuItem
                  key={alert.id}
                  className="flex items-start gap-2 py-2"
                  onClick={() => onAcknowledgeAlert?.(alert.id)}
                >
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      alert.severity === 'critical' ? 'bg-destructive' :
                      alert.severity === 'warning' ? 'bg-warning' : 'bg-primary'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{alert.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {alert.message} · {formatRelative(alert.timestamp)}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
            {unacked.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center text-sm text-primary"
                  onClick={() => onAcknowledgeAll?.()}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Mark all as read
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-1.5 py-1 transition-colors hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {(username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{username || 'User'}</span>
                  <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                    {role || 'viewer'}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {email || ''}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate?.('profile')}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate?.('settings')}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

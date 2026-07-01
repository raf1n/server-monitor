import { Globe, MapPin, Monitor, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store";
import { useGetServersQuery } from "@/features/servers/serversApi";
import { selectSelectedId, selectServers } from "@/features/servers/serversSelectors";
import { selectServer } from "@/features/servers/serversSlice";
import { selectSettings } from "@/features/settings/settingsSelectors";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ServerInfo, ServerStatus } from "@/lib/types";

const STATUS_STYLES: Record<
  ServerStatus,
  { label: string; dot: string; bg: string; border: string }
> = {
  online: { label: "Online", dot: "bg-success", bg: "bg-success/10", border: "border-success/30" },
  offline: {
    label: "Offline",
    dot: "bg-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
};

function ServerCard({
  server,
  isSelected,
  onSelect,
  showSensitiveData,
}: {
  server: ServerInfo;
  isSelected: boolean;
  onSelect: () => void;
  showSensitiveData: boolean;
}) {
  const style = STATUS_STYLES[server.status];
  return (
    <button onClick={onSelect} className="w-full text-left">
      <Card
        className={cn(
          "relative overflow-hidden border p-5 transition-all hover:shadow-md",
          isSelected
            ? "border-primary ring-1 ring-primary"
            : "border-border hover:border-muted-foreground/30",
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", style.bg)}>
              <Monitor
                className={cn(
                  "h-5 w-5",
                  server.status === "online"
                    ? "text-success"
                    : server.status === "offline"
                      ? "text-destructive"
                      : "text-warning",
                )}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{server.name}</p>
              <p className="text-xs text-muted-foreground">
                {showSensitiveData ? server.host : "***"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("gap-1.5", style.border, style.bg)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
            {style.label}
          </Badge>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {server.region}
          </span>
          <span className="flex items-center gap-1">
            <Wifi className="h-3.5 w-3.5" />
            {showSensitiveData ? server.host : "***"}
          </span>
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            {server.id}
          </span>
        </div>
      </Card>
    </button>
  );
}

export function ServersPage() {
  const dispatch = useAppDispatch();
  const serverId = useAppSelector(selectSelectedId);
  const settings = useAppSelector(selectSettings);
  const cachedServers = useAppSelector(selectServers);

  const { data: apiServers = [] } = useGetServersQuery(undefined, {
    skip: import.meta.env.VITE_API_URL === undefined,
  });

  const servers = cachedServers.length > 0 ? cachedServers : apiServers;

  const onlineCount = servers.filter((s) => s.status === "online").length;
  const degradedCount = servers.filter((s) => s.status === "degraded").length;
  const offlineCount = servers.filter((s) => s.status === "offline").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Servers</h1>
        <p className="text-sm text-muted-foreground">
          Managing {servers.length} server{servers.length !== 1 ? "s" : ""} across your
          infrastructure
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <Monitor className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{onlineCount}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <Monitor className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{degradedCount}</p>
            <p className="text-xs text-muted-foreground">Degraded</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <Monitor className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{offlineCount}</p>
            <p className="text-xs text-muted-foreground">Offline</p>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {servers.map((server) => (
          <ServerCard
            key={server.id}
            server={server}
            isSelected={server.id === serverId}
            onSelect={() => dispatch(selectServer(server.id))}
            showSensitiveData={settings.showSensitiveData}
          />
        ))}
      </div>
    </div>
  );
}

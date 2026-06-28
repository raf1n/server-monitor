import { useState } from "react";
import {
  Bell,
  BellOff,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  Globe,
  RefreshCw,
  Save,
  Server,
  Shield,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  useSettings,
  useUpdateSetting,
  useResetDefaults,
  useSaveSettings,
  useServers,
  useSelectedId,
} from "@/store";

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: SettingsSectionProps) {
  return (
    <Card className="border-border">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </Card>
  );
}

interface SettingRowProps {
  label: string;
  description: string;
  control: React.ReactNode;
}

function SettingRow({ label, description, control }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      {control}
    </div>
  );
}

export function SettingsPage() {
  const settings = useSettings();
  const updateSetting = useUpdateSetting();
  const resetDefaults = useResetDefaults();
  const saveToBackend = useSaveSettings();
  const servers = useServers();
  const serverId = useSelectedId();
  const currentAgentVersion = servers.find((s) => s.id === serverId)?.agentVersion;
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await saveToBackend();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your monitoring dashboard preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetDefaults}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} className="gap-1.5" size="sm">
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SettingsSection
            title="Monitoring"
            description="Data collection and refresh settings"
            icon={Gauge}
          >
            <SettingRow
              label="Refresh Interval"
              description="How often to poll server metrics"
              control={
                <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-0.5">
                  {["1", "2", "5", "10"].map((v) => (
                    <button
                      key={v}
                      onClick={() => updateSetting("refreshInterval", v)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                        settings.refreshInterval === v
                          ? "bg-accent text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {v}s
                    </button>
                  ))}
                </div>
              }
            />
            <Separator />
            <SettingRow
              label="Auto-reconnect"
              description="Automatically reconnect on connection loss"
              control={
                <Switch
                  checked={settings.autoReconnect}
                  onCheckedChange={(v) => updateSetting("autoReconnect", v)}
                />
              }
            />
          </SettingsSection>

          <SettingsSection
            title="Display"
            description="Visual preferences"
            icon={Eye}
          >
            <SettingRow
              label="Show sensitive data"
              description="Display IP addresses and host details"
              control={
                <Switch
                  checked={settings.showSensitiveData}
                  onCheckedChange={(v) => updateSetting("showSensitiveData", v)}
                />
              }
            />
            <Separator />
            <SettingRow
              label="Compact mode"
              description="Reduce spacing in data tables"
              control={
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(v) => updateSetting("compactMode", v)}
                />
              }
            />
            <Separator />
            <SettingRow
              label="Chart animations"
              description="Animate chart transitions and updates"
              control={
                <Switch
                  checked={settings.chartAnimations}
                  onCheckedChange={(v) => updateSetting("chartAnimations", v)}
                />
              }
            />
          </SettingsSection>
        </div>

        <div className="space-y-6">
          <SettingsSection
            title="Notifications"
            description="Alert and notification preferences"
            icon={Bell}
          >
            <SettingRow
              label="Push notifications"
              description="Receive desktop notifications for alerts"
              control={
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(v) => updateSetting("notifications", v)}
                />
              }
            />
            <Separator />
            <SettingRow
              label="Alert sounds"
              description="Play sound when critical alerts fire"
              control={
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(v) => updateSetting("soundEnabled", v)}
                />
              }
            />
            <Separator />
            <SettingRow
              label="Critical alert threshold"
              description="CPU/Memory percentage for critical status"
              control={
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.criticalThreshold}
                    onChange={(e) =>
                      updateSetting("criticalThreshold", e.target.value)
                    }
                    className="h-8 w-16 border-border bg-secondary/50 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              }
            />
          </SettingsSection>

          <SettingsSection
            title="About"
            description="System information and version"
            icon={Server}
          >
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium text-foreground">{__APP_VERSION__}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Build</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {__BUILD__}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Node</span>
                <span className="font-mono text-xs text-foreground">
                  {__BUILD_NODE__}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Agent</span>
                <span className="font-mono text-xs text-foreground">
                  {currentAgentVersion ? `v${currentAgentVersion}` : '---'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">License</span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-muted-foreground"
                >
                  MIT
                </Badge>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

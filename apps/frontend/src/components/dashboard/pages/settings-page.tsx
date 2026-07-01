import { useEffect, useRef, useState } from "react";
import { Bell, Eye, Gauge, Globe, RefreshCw, Save, Server } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import { selectSelectedId, selectServers } from "@/features/servers/serversSelectors";
import { selectSettings } from "@/features/settings/settingsSelectors";
import { updateSetting, mergeSettings, resetDefaults } from "@/features/settings/settingsSlice";
import { useGetSettingsQuery, useSaveSettingsMutation } from "@/features/settings/settingsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { AppSettings } from "@/features/settings/settingsSlice";

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function SettingsSection({ title, description, icon: Icon, children }: SettingsSectionProps) {
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
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectSettings);
  const selectedServerId = useAppSelector(selectSelectedId);
  const servers = useAppSelector(selectServers);
  const [saveSettings] = useSaveSettingsMutation();
  const [saved, setSaved] = useState(false);
  const [scopeServerId, setScopeServerId] = useState<string | undefined>(undefined);
  const seeded = useRef<string | undefined>(undefined);

  const { data: backendSettings } = useGetSettingsQuery(scopeServerId, {
    skip: import.meta.env.VITE_API_URL === undefined,
  });

  useEffect(() => {
    if (!backendSettings || seeded.current === scopeServerId) return;
    seeded.current = scopeServerId;
    dispatch(mergeSettings(backendSettings));
  }, [backendSettings, dispatch, scopeServerId]);

  const currentAgentVersion = servers.find((s) => s.id === selectedServerId)?.agentVersion;

  const handleUpdateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    dispatch(updateSetting({ key, value }));
  };

  const KEY_MAP: Record<string, string> = {
    cpuCriticalThreshold: "threshold.cpu.critical",
    cpuWarnThreshold: "threshold.cpu.warn",
    memCriticalThreshold: "threshold.mem.critical",
    memWarnThreshold: "threshold.mem.warn",
    diskCriticalThreshold: "threshold.disk.critical",
  };

  const handleSave = async () => {
    if (import.meta.env.VITE_API_URL === undefined) return;
    try {
      const entries: Record<string, string> = {};
      for (const [k, v] of Object.entries(settings)) {
        entries[KEY_MAP[k] ?? k] = String(v);
      }
      await saveSettings({ settings: entries, serverId: scopeServerId }).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.warn("Failed to save settings to backend:", err);
    }
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
          <div className="flex items-center gap-2 mr-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select
              value={scopeServerId ?? "__global__"}
              onValueChange={(val) => {
                setScopeServerId(val === "__global__" ? undefined : val);
                seeded.current = undefined;
              }}
            >
              <SelectTrigger className="h-8 w-40 border-border bg-secondary/50 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Global</SelectItem>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(resetDefaults())}
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
          <SettingsSection title="Display" description="Visual preferences" icon={Eye}>
            <SettingRow
              label="Show sensitive data"
              description="Display IP addresses and host details"
              control={
                <Switch
                  checked={settings.showSensitiveData}
                  onCheckedChange={(v) => handleUpdateSetting("showSensitiveData", v)}
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
                  onCheckedChange={(v) => handleUpdateSetting("compactMode", v)}
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
                  onCheckedChange={(v) => handleUpdateSetting("chartAnimations", v)}
                />
              }
            />
          </SettingsSection>

          <SettingsSection
            title="Thresholds"
            description="Alert threshold percentages for CPU, memory, and disk"
            icon={Gauge}
          >
            <SettingRow
              label="CPU critical"
              description="CPU % triggers critical alert"
              control={
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.cpuCriticalThreshold}
                    onChange={(e) => handleUpdateSetting("cpuCriticalThreshold", e.target.value)}
                    className="h-8 w-16 border-border bg-secondary/50 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              }
            />
            <Separator />
            <SettingRow
              label="CPU warning"
              description="CPU % triggers warning alert"
              control={
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.cpuWarnThreshold}
                    onChange={(e) => handleUpdateSetting("cpuWarnThreshold", e.target.value)}
                    className="h-8 w-16 border-border bg-secondary/50 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              }
            />
            <Separator />
            <SettingRow
              label="Memory critical"
              description="Memory % triggers critical alert"
              control={
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.memCriticalThreshold}
                    onChange={(e) => handleUpdateSetting("memCriticalThreshold", e.target.value)}
                    className="h-8 w-16 border-border bg-secondary/50 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              }
            />
            <Separator />
            <SettingRow
              label="Memory warning"
              description="Memory % triggers warning alert"
              control={
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.memWarnThreshold}
                    onChange={(e) => handleUpdateSetting("memWarnThreshold", e.target.value)}
                    className="h-8 w-16 border-border bg-secondary/50 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              }
            />
            <Separator />
            <SettingRow
              label="Disk critical"
              description="Disk % triggers critical alert"
              control={
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.diskCriticalThreshold}
                    onChange={(e) => handleUpdateSetting("diskCriticalThreshold", e.target.value)}
                    className="h-8 w-16 border-border bg-secondary/50 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              }
            />
          </SettingsSection>
        </div>

        <div className="space-y-6">
          <SettingsSection title="Monitoring" description="Connection preferences" icon={Gauge}>
            <SettingRow
              label="Auto-reconnect"
              description="Automatically reconnect on connection loss"
              control={
                <Switch
                  checked={settings.autoReconnect}
                  onCheckedChange={(v) => handleUpdateSetting("autoReconnect", v)}
                />
              }
            />
          </SettingsSection>

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
                  onCheckedChange={(v) => handleUpdateSetting("notifications", v)}
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
                  onCheckedChange={(v) => handleUpdateSetting("soundEnabled", v)}
                />
              }
            />
            <Separator />
            <SettingRow
              label="Email"
              description="Notification email address"
              control={
                <Input
                  value={settings.notificationEmail}
                  onChange={(e) => handleUpdateSetting("notificationEmail", e.target.value)}
                  placeholder="e.g. alerts@example.com"
                  className="h-8 w-52 border-border bg-secondary/50 text-xs"
                />
              }
            />
            <Separator />
            <SettingRow
              label="Webhook URL"
              description="Generic webhook endpoint"
              control={
                <Input
                  value={settings.notificationWebhook}
                  onChange={(e) => handleUpdateSetting("notificationWebhook", e.target.value)}
                  placeholder="https://hooks.example.com/..."
                  className="h-8 w-52 border-border bg-secondary/50 text-xs"
                />
              }
            />
            <Separator />
            <SettingRow
              label="Discord Webhook"
              description="Discord channel webhook URL"
              control={
                <Input
                  value={settings.notificationDiscord}
                  onChange={(e) => handleUpdateSetting("notificationDiscord", e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="h-8 w-52 border-border bg-secondary/50 text-xs"
                />
              }
            />
            <Separator />
            <SettingRow
              label="Telegram Bot Token"
              description="Bot token from @BotFather"
              control={
                <Input
                  value={settings.notificationTelegramBotToken}
                  onChange={(e) => handleUpdateSetting("notificationTelegramBotToken", e.target.value)}
                  placeholder="123456:ABC-DEF1234..."
                  className="h-8 w-52 border-border bg-secondary/50 text-xs"
                />
              }
            />
            <Separator />
            <SettingRow
              label="Telegram Chat ID"
              description="Chat or channel ID for notifications"
              control={
                <Input
                  value={settings.notificationTelegramChatId}
                  onChange={(e) => handleUpdateSetting("notificationTelegramChatId", e.target.value)}
                  placeholder="e.g. -1001234567890"
                  className="h-8 w-52 border-border bg-secondary/50 text-xs"
                />
              }
            />
          </SettingsSection>

          <SettingsSection title="About" description="System information and version" icon={Server}>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium text-foreground">{__APP_VERSION__}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Build</span>
                <span className="font-mono text-xs text-muted-foreground">{__BUILD__}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Node</span>
                <span className="font-mono text-xs text-foreground">{__BUILD_NODE__}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Agent</span>
                <span className="font-mono text-xs text-foreground">
                  {currentAgentVersion ? `v${currentAgentVersion}` : "---"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">License</span>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
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

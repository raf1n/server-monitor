import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Copy, Trash2, ShieldOff, Check, AlertTriangle, Clock, Server } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface ApiKey {
  id: string;
  keyPrefix: string;
  serverId?: string;
  label?: string;
  revoked: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyServerId, setNewKeyServerId] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await api.apiKeys.list();
      setKeys(data);
    } catch (err) {
      console.warn('Failed to fetch API keys:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await api.apiKeys.create({
        label: newKeyLabel || undefined,
        serverId: newKeyServerId || undefined,
      });
      setGeneratedKey(result.key);
      setNewKeyLabel('');
      setNewKeyServerId('');
      fetchKeys();
    } catch (err) {
      console.error('Failed to create key:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.apiKeys.revoke(id);
      fetchKeys();
    } catch (err) {
      console.error('Failed to revoke key:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.apiKeys.delete(id);
      fetchKeys();
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  };

  const activeKeys = keys.filter((k) => !k.revoked);
  const revokedKeys = keys.filter((k) => k.revoked);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage agent authentication keys. Each key can be scoped to a specific server.
          </p>
        </div>
        <Button onClick={() => { setGeneratedKey(null); setCreateOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Key
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{keys.length}</p>
              <p className="text-xs text-muted-foreground">Total Keys</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeKeys.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
              <ShieldOff className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{revokedKeys.length}</p>
              <p className="text-xs text-muted-foreground">Revoked</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Key list */}
      {keys.length === 0 ? (
        <Card className="p-12 text-center">
          <Key className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground">No API keys yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a key to let agents authenticate with your server.</p>
          <Button onClick={() => { setGeneratedKey(null); setCreateOpen(true); }} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Create your first key
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <Card key={key.id} className={`p-4 ${key.revoked ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${key.revoked ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'}`}>
                    <Key className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-medium text-foreground">
                        sm_{key.keyPrefix}****
                      </code>
                      {key.revoked ? (
                        <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px] bg-success text-success-foreground">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {key.label && <span>{key.label}</span>}
                      {key.serverId && (
                        <span className="flex items-center gap-1">
                          <Server className="h-3 w-3" /> {key.serverId}
                        </span>
                      )}
                      {!key.serverId && <span className="text-muted-foreground/70">All servers</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDate(key.createdAt)}
                      </span>
                      {key.lastUsedAt && (
                        <span>Last used {formatDate(key.lastUsedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!key.revoked && (
                    <Button variant="outline" size="sm" onClick={() => handleRevoke(key.id)} className="gap-1.5 text-xs">
                      <ShieldOff className="h-3.5 w-3.5" /> Revoke
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(key.id)} className="gap-1.5 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          {!generatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Generate a new key for an agent. Optionally scope it to a specific server.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="key-label">Label (optional)</Label>
                  <Input
                    id="key-label"
                    placeholder="e.g. Production Web Server"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-server">Server ID (optional)</Label>
                  <Input
                    id="key-server"
                    placeholder="e.g. srv-web-01 — leave empty for all servers"
                    value={newKeyServerId}
                    onChange={(e) => setNewKeyServerId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If set, this key will only accept data from this server ID.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating...' : 'Generate Key'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Key Created</DialogTitle>
                <DialogDescription>
                  Copy this key now — it will never be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                  <p className="text-xs text-warning-foreground">
                    Save this key somewhere safe. You won't be able to see it again.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted p-3 text-sm font-mono break-all select-all">
                    {generatedKey}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setGeneratedKey(null); }}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

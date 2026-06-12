import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/lib/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, Building2, Crown, UserCog, Users, Inbox, Mail,
  ChevronLeft, Trash2, UserPlus, Copy, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Platform admin — IRB Coaching" }] }),
  component: AdminPage,
});

type Stats = {
  platform_owners: number;
  clubs: number;
  club_owners: number;
  club_admins: number;
  coaches: number;
  members: number;
  pending_requests: number;
};

type PlatformOwner = { user_id: string; full_name: string | null; email: string | null; created_at: string };
type Coach = { user_id: string; full_name: string | null; email: string | null; club_id: string; club_name: string; role: string };

function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [checking, setChecking] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [canBootstrap, setCanBootstrap] = useState(false);
  const [busy, setBusy] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [owners, setOwners] = useState<PlatformOwner[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  // Owner-add form
  const [newOwnerEmail, setNewOwnerEmail] = useState("");

  // Email coaches state
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const [statsRes, ownersRes, coachesRes] = await Promise.all([
      supabase.rpc("get_platform_stats"),
      supabase.rpc("list_platform_owners"),
      supabase.rpc("list_platform_coaches"),
    ]);
    if (!statsRes.error) setStats(statsRes.data as Stats);
    if (!ownersRes.error) setOwners((ownersRes.data ?? []) as PlatformOwner[]);
    if (!coachesRes.error) setCoaches((coachesRes.data ?? []) as Coach[]);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setChecking(true);
      const { count } = await supabase
        .from("platform_owners")
        .select("user_id", { head: true, count: "exact" })
        .eq("user_id", user.id);
      const owner = (count ?? 0) > 0;
      setIsOwner(owner);
      if (owner) {
        await refresh();
      } else {
        // Eligible to bootstrap if no platform owner exists AND user is a club owner
        const [{ count: anyOwner }, { count: clubOwnerCount }] = await Promise.all([
          supabase.from("platform_owners").select("user_id", { head: true, count: "exact" }),
          supabase.from("user_roles").select("id", { head: true, count: "exact" }).eq("user_id", user.id).eq("role", "owner"),
        ]);
        setCanBootstrap((anyOwner ?? 0) === 0 && (clubOwnerCount ?? 0) > 0);
      }
      setChecking(false);
    })();
  }, [user?.id]);

  const onBootstrap = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("bootstrap_platform_owner");
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("You're now a platform owner.");
    setIsOwner(true);
    setCanBootstrap(false);
    await refresh();
  };

  const onAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email("Enter a valid email").safeParse(newOwnerEmail);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.rpc("grant_platform_owner", { _email: parsed.data });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Platform owner added.");
    setNewOwnerEmail("");
    await refresh();
  };

  const onRevoke = async (po: PlatformOwner) => {
    const ok = await confirm({
      title: "Remove platform owner?",
      description: `${po.full_name ?? po.email ?? "This user"} will no longer have admin access.`,
      confirmText: "Remove",
    });
    if (!ok) return;
    const { error } = await supabase.rpc("revoke_platform_owner", { _user_id: po.user_id });
    if (error) { toast.error(error.message); return; }
    toast.success("Removed.");
    await refresh();
  };

  const clubs = useMemo(() => {
    const map = new Map<string, string>();
    coaches.forEach((c) => map.set(c.club_id, c.club_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [coaches]);

  const filteredCoaches = useMemo(
    () => clubFilter === "all" ? coaches : coaches.filter((c) => c.club_id === clubFilter),
    [coaches, clubFilter],
  );

  const toggleAll = () => {
    if (selected.size === filteredCoaches.length) setSelected(new Set());
    else setSelected(new Set(filteredCoaches.map((c) => c.user_id + "|" + c.club_id)));
  };

  const selectedEmails = useMemo(() => {
    const seen = new Set<string>();
    filteredCoaches.forEach((c) => {
      const key = c.user_id + "|" + c.club_id;
      if (selected.has(key) && c.email) seen.add(c.email);
    });
    return Array.from(seen);
  }, [filteredCoaches, selected]);

  const openMail = () => {
    if (selectedEmails.length === 0) { toast.error("Pick at least one coach"); return; }
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (message) params.set("body", message);
    const url = `mailto:?bcc=${encodeURIComponent(selectedEmails.join(","))}&${params.toString()}`;
    window.location.href = url;
  };

  const copyEmails = async () => {
    if (selectedEmails.length === 0) { toast.error("Pick at least one coach"); return; }
    try { await navigator.clipboard.writeText(selectedEmails.join(", ")); toast.success("Copied emails"); }
    catch { toast.error("Could not copy"); }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>
        <Card className="p-6 text-center space-y-4">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Platform admin</h1>
          {canBootstrap ? (
            <>
              <p className="text-sm text-muted-foreground">
                No platform owner is set up yet. Since you're a club owner, you can claim this role.
              </p>
              <Button onClick={onBootstrap} disabled={busy} className="w-full">
                {busy ? "Working…" : "Become the first platform owner"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You need platform-owner access to view this page. Ask an existing platform owner to add you.
            </p>
          )}
          <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })} className="w-full">
            Back to dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-surf-gradient text-primary-foreground safe-top px-6 pt-10 pb-12">
        <Link to="/dashboard" className="inline-flex items-center text-xs opacity-80 hover:opacity-100">
          <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <div className="flex items-center gap-3 mt-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Platform admin</h1>
            <p className="text-sm opacity-90">Across every club on IRB Coaching</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-3xl mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={Shield} label="Platform owners" value={stats?.platform_owners} />
          <StatCard icon={Building2} label="Clubs" value={stats?.clubs} />
          <StatCard icon={Crown} label="Club owners" value={stats?.club_owners} />
          <StatCard icon={UserCog} label="Coaches" value={stats?.coaches} />
          <StatCard icon={Users} label="Members" value={stats?.members} />
          <StatCard icon={Inbox} label="Pending join requests" value={stats?.pending_requests} />
        </div>

        {/* Platform owners */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Platform owners</h2>
            <Badge variant="secondary" className="ml-auto">{owners.length}</Badge>
          </div>

          <form onSubmit={onAddOwner} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-owner" className="text-xs">Add by email</Label>
              <Input
                id="new-owner"
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                placeholder="coach@example.com"
              />
            </div>
            <Button type="submit" disabled={busy} className="self-end">
              <UserPlus className="h-4 w-4 mr-1.5" /> Add owner
            </Button>
          </form>
          <p className="text-xs text-muted-foreground -mt-1">
            The user must have signed up first (you can only add existing accounts).
          </p>

          <div className="divide-y rounded-md border">
            {owners.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">No platform owners yet.</div>
            )}
            {owners.map((po) => (
              <div key={po.user_id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{po.full_name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground truncate">{po.email ?? "—"}</div>
                </div>
                {po.user_id === user?.id ? (
                  <Badge variant="secondary">You</Badge>
                ) : (
                  <Button size="icon" variant="ghost" onClick={() => onRevoke(po)} aria-label="Remove owner">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Email coaches */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Email coaches</h2>
            <Badge variant="secondary" className="ml-auto">{filteredCoaches.length} eligible</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Filter by club</Label>
              <Select value={clubFilter} onValueChange={(v) => { setClubFilter(v); setSelected(new Set()); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clubs</SelectItem>
                  {clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="secondary" onClick={toggleAll}>
              {selected.size === filteredCoaches.length && filteredCoaches.length > 0 ? "Clear all" : "Select all"}
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y rounded-md border">
            {filteredCoaches.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">No coaches with an email on file.</div>
            )}
            {filteredCoaches.map((c) => {
              const key = c.user_id + "|" + c.club_id;
              const checked = selected.has(key);
              return (
                <label key={key} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(key); else next.add(key);
                      setSelected(next);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.full_name || c.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.email} · {c.club_name}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{c.role.replace("_", " ")}</Badge>
                </label>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subj" className="text-xs">Subject</Label>
            <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Updates from IRB Coaching" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg" className="text-xs">Message</Label>
            <Textarea id="msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi coaches, …" />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
            <div className="font-medium text-foreground">Sending from the app</div>
            <p>
              In-app sending needs a verified sender domain (e.g. <code>notify.irbracing.app</code>). Set one up once and
              you'll be able to send branded emails directly from here. In the meantime, you can open your mail app
              pre-filled with the selected coaches, or copy their addresses to paste anywhere.
            </p>
            <div>
              <a className="underline" href="/dashboard?cloud=emails">Set up email domain</a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" onClick={openMail} className="flex-1">
              <Mail className="h-4 w-4 mr-1.5" /> Open mail app ({selectedEmails.length})
            </Button>
            <Button type="button" variant="secondary" onClick={copyEmails}>
              <Copy className="h-4 w-4 mr-1.5" /> Copy addresses
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value,
}: { icon: typeof Shield; label: string; value: number | undefined }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value ?? "—"}</div>
    </Card>
  );
}

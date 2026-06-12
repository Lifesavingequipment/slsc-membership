import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useClub, useCanManage } from "@/lib/club-context";
import { AppShell } from "@/components/AppShell";
import { EquipmentTabs } from "@/components/equipment/EquipmentTabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/equipment/faults")({
  head: () => ({ meta: [{ title: "Faults — IRB Coaching" }] }),
  component: FaultsPage,
});

type Fault = {
  id: string;
  title: string | null;
  description: string;
  equipment_name: string | null;
  equipment_id: string | null;
  reported_by: string;
  reported_at: string;
  status: "open" | "repaired" | "cleared";
  resolved_by: string | null;
  resolved_at: string | null;
};

type ProfileLite = { id: string; full_name: string | null; first_name: string | null; last_name: string | null };

function displayName(p?: ProfileLite | null): string {
  if (!p) return "Unknown";
  const fn = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return fn || p.full_name || "Unknown";
}

function FaultsPage() {
  const { activeClub } = useClub();
  const { user } = useAuth();
  const canManage = useCanManage();
  const [faults, setFaults] = useState<Fault[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [equipNames, setEquipNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!activeClub) return;
    const { data } = await supabase
      .from("equipment_faults")
      .select("id, title, description, equipment_name, equipment_id, reported_by, reported_at, status, resolved_by, resolved_at")
      .eq("club_id", activeClub.club_id)
      .order("reported_at", { ascending: false });
    const list = (data ?? []) as Fault[];
    setFaults(list);

    const userIds = Array.from(new Set(list.flatMap((f) => [f.reported_by, f.resolved_by]).filter(Boolean) as string[]));
    if (userIds.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", userIds);
      const map: Record<string, ProfileLite> = {};
      (p ?? []).forEach((row) => { map[row.id] = row as ProfileLite; });
      setProfiles(map);
    }
    const equipIds = Array.from(new Set(list.map((f) => f.equipment_id).filter(Boolean) as string[]));
    if (equipIds.length) {
      const { data: eq } = await supabase
        .from("equipment").select("id, name").in("id", equipIds);
      const map: Record<string, string> = {};
      (eq ?? []).forEach((row) => { map[row.id] = row.name; });
      setEquipNames(map);
    }
  }, [activeClub?.club_id]);

  useEffect(() => { load(); }, [load]);

  const markFixed = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("equipment_faults")
      .update({ status: "repaired", resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as fixed");
    load();
  };

  if (!activeClub) {
    return <AppShell><div className="py-12 text-center text-sm text-muted-foreground">Select a club first.</div></AppShell>;
  }

  return (
    <AppShell title="Equipment" action={
      user ? (
        <NewFaultDialog
          open={open} setOpen={setOpen}
          clubId={activeClub.club_id} userId={user.id} onSaved={load}
        />
      ) : undefined
    }>
      <EquipmentTabs />

      {faults.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No faults reported.</p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Report a fault
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {faults.map((f) => {
            const equipName = f.equipment_name
              || (f.equipment_id ? equipNames[f.equipment_id] : null)
              || "—";
            const isOpen = f.status === "open";
            return (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">
                        {f.title || f.description.slice(0, 60)}
                      </div>
                      {isOpen ? (
                        <Badge variant="destructive" className="text-[10px]">Open</Badge>
                      ) : (
                        <Badge className="bg-success text-success-foreground text-[10px]">Fixed</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {equipName} · {displayName(profiles[f.reported_by])} ·{" "}
                      {new Date(f.reported_at).toLocaleDateString()}
                    </div>
                    {f.title && (
                      <p className="mt-2 text-sm whitespace-pre-wrap">{f.description}</p>
                    )}
                  </div>
                </div>
                {isOpen && canManage && (
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => markFixed(f.id)}>
                      <CheckCircle2 className="h-4 w-4" /> Mark fixed
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function NewFaultDialog({ open, setOpen, clubId, userId, onSaved }: {
  open: boolean; setOpen: (v: boolean) => void;
  clubId: string; userId: string; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [equipName, setEquipName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("equipment_faults").insert({
      club_id: clubId,
      reported_by: userId,
      title: title.trim(),
      equipment_name: equipName.trim() || null,
      description: desc.trim(),
      status: "open",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Fault reported");
    setTitle(""); setEquipName(""); setDesc("");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1">
          <Plus className="h-4 w-4" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report a fault</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Fault title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Engine won't start" required />
          </div>
          <div className="space-y-1.5">
            <Label>Equipment name</Label>
            <Input value={equipName} onChange={(e) => setEquipName(e.target.value)}
              placeholder="IRB Hull #3" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="What happened and what's affected?" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

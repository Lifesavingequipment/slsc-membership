import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCanManage, useIsAdmin } from "@/lib/club-context";
import { useConfirm } from "@/lib/confirm";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, AlertTriangle, Trash2, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/equipment/$equipmentId")({
  head: () => ({ meta: [{ title: "Equipment — IRB Coaching" }] }),
  component: EquipmentDetail,
});

type Equipment = {
  id: string; club_id: string; name: string; category: string | null;
  serial_number: string | null; notes: string | null; status: "active" | "retired";
};

type Fault = {
  id: string; description: string; status: "open" | "repaired" | "cleared";
  reported_by: string; reported_at: string; resolved_at: string | null;
  resolution_notes: string | null;
  reporter: { full_name: string | null } | null;
};


function EquipmentDetail() {
  const { equipmentId } = Route.useParams();
  const { user } = useAuth();
  const canManage = useCanManage();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const confirm = useConfirm();


  const [item, setItem] = useState<Equipment | null>(null);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: e } = await supabase.from("equipment").select("*")
      .eq("id", equipmentId).maybeSingle();
    setItem(e as Equipment | null);
    const { data: f } = await supabase.from("equipment_faults")
      .select("*")
      .eq("equipment_id", equipmentId)
      .order("reported_at", { ascending: false });
    const rows = (f ?? []) as Omit<Fault, "reporter">[];
    const ids = Array.from(new Set(rows.map((x) => x.reported_by)));
    let profs: { id: string; full_name: string | null }[] = [];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      profs = p ?? [];
    }
    setFaults(rows.map((r) => ({
      ...r,
      reporter: profs.find((p) => p.id === r.reported_by)
        ? { full_name: profs.find((p) => p.id === r.reported_by)!.full_name }
        : null,
    })));
  }, [equipmentId]);

  useEffect(() => { load(); }, [load]);

  if (!item) {
    return <AppShell><div className="py-12 text-center text-sm text-muted-foreground">Loading…</div></AppShell>;
  }

  const saveField = async (patch: Partial<Equipment>) => {
    const { error } = await supabase.from("equipment").update(patch).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Delete this equipment?",
      description: `"${item.name}" and its fault history will be removed. This can't be undone.`,
    });
    if (!ok) return;
    const { error } = await supabase.from("equipment").delete().eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Equipment deleted");
    navigate({ to: "/equipment" });
  };

  const updateFault = async (id: string, status: Fault["status"], notes?: string) => {
    const patch: { status: Fault["status"]; resolved_by?: string | null; resolved_at?: string | null; resolution_notes?: string | null } = { status };
    if (status === "cleared" || status === "repaired") {
      patch.resolved_by = user?.id ?? null;
      patch.resolved_at = new Date().toISOString();
    }
    if (notes !== undefined) patch.resolution_notes = notes;
    const { error } = await supabase.from("equipment_faults").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <AppShell>
      <Link to="/equipment" className="inline-flex items-center text-sm text-muted-foreground mb-2">
        <ChevronLeft className="h-4 w-4" /> Equipment
      </Link>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{item.name}</h1>
            <div className="text-xs text-muted-foreground">
              {[item.category, item.serial_number].filter(Boolean).join(" · ") || "No details"}
            </div>
          </div>
          {item.status === "retired" && <Badge variant="outline">Retired</Badge>}
        </div>

        {canManage ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category" defaultValue={item.category ?? ""}
                onSave={(v) => saveField({ category: v || null })} />
              <Field label="Serial #" defaultValue={item.serial_number ?? ""}
                onSave={(v) => saveField({ serial_number: v || null })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={3} defaultValue={item.notes ?? ""}
                onBlur={(e) => {
                  if ((e.target.value || null) !== item.notes) saveField({ notes: e.target.value || null });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={item.status} onValueChange={(v) => saveField({ status: v as Equipment["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : item.notes ? (
          <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">{item.notes}</p>
        ) : null}
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fault log</h2>
        <ReportFaultDialog
          open={reportOpen} setOpen={setReportOpen}
          equipmentId={item.id} clubId={item.club_id} userId={user?.id ?? null} onSaved={load}
        />
      </div>

      <div className="mt-3 space-y-2">
        {faults.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            No faults reported.
          </Card>
        ) : faults.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={f.status === "open" ? "destructive" : f.status === "repaired" ? "secondary" : "outline"}>
                    {f.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(f.reported_at), "d MMM yyyy")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{f.description}</p>
                {f.reporter?.full_name && (
                  <div className="mt-1 text-xs text-muted-foreground">Reported by {f.reporter.full_name}</div>
                )}
                {f.resolution_notes && (
                  <div className="mt-2 text-xs bg-muted/40 rounded p-2 whitespace-pre-wrap">
                    {f.resolution_notes}
                  </div>
                )}
              </div>
              {f.status === "open" && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
            </div>
            {canManage && f.status !== "cleared" && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["open", "repaired", "cleared"] as const).map((s) => (
                  <Button
                    key={s} size="sm" variant={f.status === s ? "default" : "outline"}
                    onClick={() => updateFault(f.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-6">
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={remove}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete equipment
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, defaultValue, onSave }: {
  label: string; defaultValue: string; onSave: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        defaultValue={defaultValue}
        onBlur={(e) => { if (e.target.value !== defaultValue) onSave(e.target.value); }}
      />
    </div>
  );
}

function ReportFaultDialog({ open, setOpen, equipmentId, clubId, userId, onSaved }: {
  open: boolean; setOpen: (v: boolean) => void;
  equipmentId: string; clubId: string; userId: string | null; onSaved: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !desc.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("equipment_faults").insert({
      equipment_id: equipmentId,
      club_id: clubId,
      reported_by: userId,
      description: desc.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Fault reported");
    setDesc("");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-4 w-4" /> Report fault
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report fault</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Textarea
            rows={4}
            placeholder="Describe the fault (e.g. starter cord frayed)…"
            value={desc} onChange={(e) => setDesc(e.target.value)} required
          />
          <DialogFooter>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Saving…" : "Submit fault"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

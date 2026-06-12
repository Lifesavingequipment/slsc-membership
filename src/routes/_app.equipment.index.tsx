import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClub, useCanManage } from "@/lib/club-context";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Wrench, AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { EquipmentTabs } from "@/components/equipment/EquipmentTabs";

export const Route = createFileRoute("/_app/equipment/")({
  head: () => ({ meta: [{ title: "Equipment — IRB Coaching" }] }),
  component: EquipmentList,
});

type Equipment = {
  id: string; name: string; category: string | null; serial_number: string | null;
  notes: string | null; status: "active" | "retired";
};

function EquipmentList() {
  const { activeClub } = useClub();
  const canManage = useCanManage();
  const [items, setItems] = useState<Equipment[]>([]);
  const [faultCounts, setFaultCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!activeClub) return;
    const { data } = await supabase
      .from("equipment").select("*")
      .eq("club_id", activeClub.club_id)
      .order("name");
    const list = (data ?? []) as Equipment[];
    setItems(list);
    if (list.length) {
      const { data: f } = await supabase
        .from("equipment_faults")
        .select("equipment_id")
        .in("equipment_id", list.map((i) => i.id))
        .eq("status", "open");
      const counts: Record<string, number> = {};
      (f ?? []).forEach((x) => { if (x.equipment_id) counts[x.equipment_id] = (counts[x.equipment_id] ?? 0) + 1; });
      setFaultCounts(counts);
    }
  }, [activeClub?.club_id]);

  useEffect(() => { load(); }, [load]);

  if (!activeClub) {
    return <AppShell><div className="py-12 text-center text-sm text-muted-foreground">Select a club first.</div></AppShell>;
  }

  return (
    <AppShell title="Equipment" action={
      canManage ? (
        <NewEquipmentDialog open={open} setOpen={setOpen} clubId={activeClub.club_id} onSaved={load} />
      ) : undefined
    }>
      <EquipmentTabs />

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <Wrench className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No equipment yet.</p>
          {canManage && (
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add first item
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <Link key={e.id} to="/equipment/$equipmentId" params={{ equipmentId: e.id }}>
              <Card className="p-4 flex items-center gap-3 hover:bg-accent/5 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{e.name}</div>
                    {e.status === "retired" && <Badge variant="outline" className="text-[10px]">Retired</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[e.category, e.serial_number].filter(Boolean).join(" · ") || "No details"}
                  </div>
                </div>
                {faultCounts[e.id] > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {faultCounts[e.id]}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewEquipmentDialog({ open, setOpen, clubId, onSaved }: {
  open: boolean; setOpen: (v: boolean) => void; clubId: string; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("equipment").insert({
      club_id: clubId,
      name: name.trim(),
      category: category.trim() || null,
      serial_number: serial.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Equipment added");
    setName(""); setCategory(""); setSerial(""); setNotes("");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New equipment</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="IRB Hull #3" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Hull / Motor / PPE" />
            </div>
            <div className="space-y-1.5">
              <Label>Serial #</Label>
              <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Saving…" : "Add equipment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

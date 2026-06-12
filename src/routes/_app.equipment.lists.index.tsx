import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClub, useCanManage } from "@/lib/club-context";
import { AppShell } from "@/components/AppShell";
import { EquipmentTabs } from "@/components/equipment/EquipmentTabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, ListChecks, Package, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/equipment/lists/")({
  head: () => ({ meta: [{ title: "Packing Lists — IRB Coaching" }] }),
  component: ListsPage,
});

type ListRow = {
  id: string;
  name: string;
  description: string | null;
  items: { quantity: number }[];
};

function ListsPage() {
  const { activeClub } = useClub();
  const canManage = useCanManage();
  const navigate = useNavigate();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeClub) return;
    const { data } = await supabase
      .from("equipment_lists")
      .select("id, name, description, items:equipment_list_items(quantity)")
      .eq("club_id", activeClub.club_id)
      .order("name");
    setLists((data ?? []) as ListRow[]);
  }, [activeClub?.club_id]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("equipment_lists").delete().eq("id", id);
    setPendingDelete(null);
    if (error) { toast.error(error.message); return; }
    toast.success("List deleted");
    load();
  };

  if (!activeClub) {
    return <AppShell><div className="py-12 text-center text-sm text-muted-foreground">Select a club first.</div></AppShell>;
  }

  return (
    <AppShell title="Equipment" action={
      canManage ? (
        <Button size="sm" variant="secondary" className="gap-1" onClick={() => navigate({ to: "/equipment/lists/new" })}>
          <Plus className="h-4 w-4" /> New
        </Button>
      ) : undefined
    }>
      <EquipmentTabs />

      {lists.length === 0 ? (
        <Card className="p-8 text-center">
          <ListChecks className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No packing lists yet.</p>
          {canManage && (
            <Button className="mt-4" onClick={() => navigate({ to: "/equipment/lists/new" })}>
              <Plus className="h-4 w-4 mr-1" /> New list
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {lists.map((l) => {
            const itemCount = l.items.length;
            const totalUnits = l.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <Card key={l.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ListChecks className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {itemCount} {itemCount === 1 ? "item" : "items"} · {totalUnits} {totalUnits === 1 ? "unit" : "units"}
                    </div>
                    {l.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{l.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" className="flex-1 gap-1">
                    <Link to="/equipment/lists/$listId/pack" params={{ listId: l.id }}>
                      <Package className="h-4 w-4" /> Pack
                    </Link>
                  </Button>
                  {canManage && (
                    <>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/equipment/lists/$listId/edit" params={{ listId: l.id }}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPendingDelete(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this list?</AlertDialogTitle>
            <AlertDialogDescription>
              The list and all its items will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && onDelete(pendingDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

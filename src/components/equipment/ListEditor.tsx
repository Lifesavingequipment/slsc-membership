import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const ITEM_CATEGORIES = [
  "Boats & Engines",
  "Safety & Gear",
  "Course Setup",
  "Other",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

type DraftItem = {
  id?: string;
  name: string;
  category: ItemCategory;
  quantity: number;
};

export function ListEditor({ clubId, userId, listId }: {
  clubId: string;
  userId: string;
  listId?: string;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { name: "", category: "Boats & Engines", quantity: 1 },
  ]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!listId);

  useEffect(() => {
    if (!listId) return;
    (async () => {
      const { data: list } = await supabase
        .from("equipment_lists")
        .select("name, description")
        .eq("id", listId)
        .maybeSingle();
      const { data: itemRows } = await supabase
        .from("equipment_list_items")
        .select("id, name, category, quantity")
        .eq("list_id", listId)
        .order("sort_order")
        .order("created_at");
      if (list) {
        setName(list.name);
        setDescription(list.description ?? "");
      }
      if (itemRows && itemRows.length) {
        setItems(itemRows.map((r) => ({
          id: r.id,
          name: r.name,
          category: (ITEM_CATEGORIES.includes(r.category as ItemCategory)
            ? r.category
            : "Other") as ItemCategory,
          quantity: r.quantity,
        })));
      }
      setLoading(false);
    })();
  }, [listId]);

  const updateItem = (i: number, patch: Partial<DraftItem>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems((arr) => [...arr, { name: "", category: "Other", quantity: 1 }]);
  const removeItem = (i: number) =>
    setItems((arr) => (arr.length <= 1 ? arr : arr.filter((_, idx) => idx !== i)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("List name is required"); return; }
    const cleanItems = items
      .map((it) => ({ ...it, name: it.name.trim() }))
      .filter((it) => it.name);
    if (cleanItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setBusy(true);

    let savedId = listId;
    if (savedId) {
      const { error } = await supabase
        .from("equipment_lists")
        .update({ name: name.trim(), description: description.trim() || null })
        .eq("id", savedId);
      if (error) { setBusy(false); toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase
        .from("equipment_lists")
        .insert({
          club_id: clubId,
          name: name.trim(),
          description: description.trim() || null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error || !data) { setBusy(false); toast.error(error?.message ?? "Failed"); return; }
      savedId = data.id;
    }

    // Sync items: delete removed, upsert kept/new
    const existingIds = items.map((i) => i.id).filter(Boolean) as string[];
    if (listId) {
      const { data: current } = await supabase
        .from("equipment_list_items")
        .select("id")
        .eq("list_id", savedId);
      const toDelete = (current ?? [])
        .map((r) => r.id)
        .filter((id) => !existingIds.includes(id));
      if (toDelete.length) {
        await supabase.from("equipment_list_items").delete().in("id", toDelete);
      }
    }

    const rows = cleanItems.map((it, idx) => ({
      id: it.id,
      list_id: savedId!,
      name: it.name,
      category: it.category,
      quantity: Math.max(1, Math.floor(it.quantity || 1)),
      sort_order: idx,
    }));
    const { error: upErr } = await supabase
      .from("equipment_list_items")
      .upsert(rows, { onConflict: "id" });
    setBusy(false);
    if (upErr) { toast.error(upErr.message); return; }

    toast.success(listId ? "List updated" : "List created");
    navigate({ to: "/equipment/lists", replace: true });
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">List name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Saturday training kit" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={2} value={description}
            onChange={(e) => setDescription(e.target.value)} />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Items</h2>
        <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1">
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((it, i) => (
          <Card key={i} className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={it.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                placeholder="Item name"
                className="flex-1"
              />
              <Button
                type="button" size="icon" variant="ghost"
                onClick={() => removeItem(i)}
                disabled={items.length <= 1}
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="grid grid-cols-[1fr_84px] gap-2">
              <Select value={it.category} onValueChange={(v) => updateItem(i, { category: v as ItemCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                aria-label="Quantity"
              />
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1"
          onClick={() => navigate({ to: "/equipment/lists" })}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : listId ? "Save changes" : "Create list"}
        </Button>
      </div>
    </form>
  );
}

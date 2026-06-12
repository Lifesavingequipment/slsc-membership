import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/lib/confirm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Lock, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buildNameMap } from "@/lib/names";

type Props = {
  sessionId: string;
  clubId: string;
  sessionTitle: string;
  sessionStartsAt: string;
  goingIds: string[]; // kept for interface compatibility — wave draw uses attendance records instead
  canManage: boolean;
};

type SlotRow = {
  id: string;
  wave: number;
  lane: number;
  driver_id: string | null;
  crew_id: string | null;
};

type MemberProfile = {
  id: string;
  full_name: string | null;
  preferred_roles: string[];
};

type Cfg = { waves_count: number; lanes_count: number };

const MAX_W = 10;
const MAX_L = 10;

const PRESETS: { w: number; l: number }[] = [
  { w: 1, l: 1 }, { w: 1, l: 2 }, { w: 2, l: 2 },
  { w: 2, l: 3 }, { w: 3, l: 3 }, { w: 3, l: 4 },
  { w: 4, l: 4 }, { w: 4, l: 5 }, { w: 5, l: 5 },
  { w: 5, l: 6 }, { w: 6, l: 6 }, { w: 6, l: 8 },
];

export function WavePanel({
  sessionId,
  canManage,
}: Props) {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [wavesInput, setWavesInput] = useState(2);
  const [lanesInput, setLanesInput] = useState(2);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    // Who is present today (marked via attendance, not RSVP)
    const { data: att } = await supabase
      .from("session_attendance")
      .select("user_id")
      .eq("session_id", sessionId)
      .eq("status", "present");

    const presentIds = (att ?? []).map((a) => a.user_id);

    let profs: MemberProfile[] = [];
    if (presentIds.length > 0) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_roles")
        .in("id", presentIds);
      profs = (p ?? []).map((r: any) => ({
        id: r.id as string,
        full_name: (r.full_name ?? null) as string | null,
        preferred_roles: (r.preferred_roles as string[]) ?? [],
      }));
    }
    setProfiles(profs);

    // Wave config
    const { data: c } = await supabase
      .from("session_draw_configs")
      .select("waves_count, lanes_count")
      .eq("session_id", sessionId)
      .maybeSingle();
    const newCfg = (c as Cfg | null) ?? null;
    setCfg(newCfg);
    if (newCfg) {
      setWavesInput(newCfg.waves_count);
      setLanesInput(newCfg.lanes_count);
    }

    // Existing slot assignments
    const { data: t } = await supabase
      .from("session_teams")
      .select("id, wave, lane, driver_id, crew_id")
      .eq("session_id", sessionId)
      .not("wave", "is", null)
      .not("lane", "is", null)
      .order("wave")
      .order("lane");
    setSlots(
      ((t ?? []) as { id: string; wave: number | null; lane: number | null; driver_id: string | null; crew_id: string | null }[])
        .filter((r) => r.wave != null && r.lane != null)
        .map((r) => ({ id: r.id, wave: r.wave!, lane: r.lane!, driver_id: r.driver_id, crew_id: r.crew_id })),
    );
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const nameMap = useMemo(() => buildNameMap(profiles), [profiles]);
  const dn = useCallback(
    (id: string | null | undefined) => (id ? (nameMap[id] ?? "Member") : "—"),
    [nameMap],
  );

  // Drivers = members with 'driver' preferred_role, OR members with no role preference (show in both)
  const drivers = useMemo(
    () =>
      profiles
        .filter((p) => {
          const roles = p.preferred_roles.map((r) => r.toLowerCase());
          return roles.includes("driver") || (!roles.includes("driver") && !roles.includes("crew"));
        })
        .sort((a, b) => (nameMap[a.id] ?? "").localeCompare(nameMap[b.id] ?? "")),
    [profiles, nameMap],
  );

  // Crew = members with 'crew' preferred_role, OR members with no role preference (show in both)
  const crew = useMemo(
    () =>
      profiles
        .filter((p) => {
          const roles = p.preferred_roles.map((r) => r.toLowerCase());
          return roles.includes("crew") || (!roles.includes("driver") && !roles.includes("crew"));
        })
        .sort((a, b) => (nameMap[a.id] ?? "").localeCompare(nameMap[b.id] ?? "")),
    [profiles, nameMap],
  );

  const assignedDriverIds = useMemo(
    () => new Set(slots.map((s) => s.driver_id).filter((x): x is string => x !== null)),
    [slots],
  );
  const assignedCrewIds = useMemo(
    () => new Set(slots.map((s) => s.crew_id).filter((x): x is string => x !== null)),
    [slots],
  );

  const slotMap = useMemo(() => {
    const m = new Map<string, SlotRow>();
    for (const s of slots) m.set(`${s.wave}:${s.lane}`, s);
    return m;
  }, [slots]);

  const setCapacity = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("session_draw_configs")
      .upsert(
        { session_id: sessionId, waves_count: wavesInput, lanes_count: lanesInput },
        { onConflict: "session_id" },
      );
    if (error) { setBusy(false); toast.error(error.message); return; }
    // Prune slots that fall outside the new grid
    const toRemove = slots.filter((s) => s.wave > wavesInput || s.lane > lanesInput);
    if (toRemove.length > 0) {
      await Promise.all(toRemove.map((s) => supabase.from("session_teams").delete().eq("id", s.id)));
    }
    setBusy(false);
    toast.success(`Capacity set: ${wavesInput} wave${wavesInput === 1 ? "" : "s"} × ${lanesInput} lane${lanesInput === 1 ? "" : "s"}`);
    load();
  };

  const assignSlot = async (wave: number, lane: number, role: "driver_id" | "crew_id", memberId: string | null) => {
    setBusy(true);
    const existing = slotMap.get(`${wave}:${lane}`);
    let error: { message: string } | null = null;
    if (existing) {
      ({ error } = await supabase.from("session_teams").update({ [role]: memberId }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("session_teams").insert({
        session_id: sessionId, wave, lane, [role]: memberId,
      }));
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const autoPair = async () => {
    if (!cfg) { toast.info("Set capacity first."); return; }
    setBusy(true);

    const availDrivers = drivers.filter((d) => !assignedDriverIds.has(d.id));
    const availCrew = crew.filter((c) => !assignedCrewIds.has(c.id));

    let di = 0;
    let ci = 0;
    const ops: Promise<any>[] = [];

    outer: for (let w = 1; w <= cfg.waves_count; w++) {
      for (let l = 1; l <= cfg.lanes_count; l++) {
        if (di >= availDrivers.length && ci >= availCrew.length) break outer;
        const slot = slotMap.get(`${w}:${l}`);
        const hasDriver = !!slot?.driver_id;
        const hasCrew = !!slot?.crew_id;
        const driverToSet = !hasDriver && di < availDrivers.length ? availDrivers[di++].id : undefined;
        const crewToSet = !hasCrew && ci < availCrew.length ? availCrew[ci++].id : undefined;
        if (driverToSet === undefined && crewToSet === undefined) continue;
        const patch: Record<string, string> = {};
        if (driverToSet !== undefined) patch.driver_id = driverToSet;
        if (crewToSet !== undefined) patch.crew_id = crewToSet;
        if (slot) {
          ops.push(supabase.from("session_teams").update(patch).eq("id", slot.id));
        } else {
          ops.push(supabase.from("session_teams").insert({ session_id: sessionId, wave: w, lane: l, ...patch }));
        }
      }
    }

    await Promise.all(ops);
    setBusy(false);

    const leftover = (availDrivers.length - di) + (availCrew.length - ci);
    if (leftover > 0) {
      toast.warning(`Paired all slots. ${leftover} member${leftover === 1 ? "" : "s"} couldn't fit — increase capacity.`);
    } else {
      toast.success("Auto-pair complete.");
    }
    load();
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: "Clear all assignments?",
      description: "All driver and crew assignments for this session will be removed.",
      confirmText: "Clear all",
    });
    if (!ok) return;
    const { error } = await supabase.from("session_teams").delete().eq("session_id", sessionId);
    if (error) { toast.error(error.message); return; }
    load();
  };

  // Read-only view for non-managers
  if (!canManage) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Lock className="h-4 w-4" /> Wave Draw (view only)
        </div>
        {cfg && slots.length > 0 ? (
          <ReadOnlyGrid cfg={cfg} slotMap={slotMap} dn={dn} />
        ) : (
          <p className="text-sm text-muted-foreground">No draw published yet.</p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step 1 — Capacity */}
      <Card className="p-3 space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Step 1 — Set Capacity
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Waves (1–{MAX_W})</label>
            <Input
              type="number"
              min={1}
              max={MAX_W}
              value={wavesInput}
              onChange={(e) =>
                setWavesInput(Math.max(1, Math.min(MAX_W, parseInt(e.target.value) || 1)))
              }
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Lanes per wave (1–{MAX_L})</label>
            <Input
              type="number"
              min={1}
              max={MAX_L}
              value={lanesInput}
              onChange={(e) =>
                setLanesInput(Math.max(1, Math.min(MAX_L, parseInt(e.target.value) || 1)))
              }
              className="h-9"
            />
          </div>
        </div>
        <Button onClick={setCapacity} disabled={busy} className="w-full">
          Set Capacity — {wavesInput} wave{wavesInput === 1 ? "" : "s"} × {lanesInput} lane{lanesInput === 1 ? "" : "s"} ({wavesInput * lanesInput} slots)
        </Button>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {PRESETS.map((p) => {
            const active = cfg?.waves_count === p.w && cfg?.lanes_count === p.l;
            const fits = p.w * p.l >= profiles.length;
            return (
              <button
                key={`${p.w}x${p.l}`}
                type="button"
                onClick={() => { setWavesInput(p.w); setLanesInput(p.l); }}
                className={[
                  "px-2 py-0.5 rounded text-[11px] border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : fits && profiles.length > 0
                    ? "bg-success/10 border-success/40 text-foreground"
                    : "bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                ].join(" ")}
              >
                {p.w}×{p.l}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {profiles.length} member{profiles.length === 1 ? "" : "s"} marked present ·{" "}
          {cfg ? `${cfg.waves_count}×${cfg.lanes_count} grid active` : "no grid set"}
        </p>
      </Card>

      {/* Step 2 — Available members */}
      <Card className="p-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Step 2 — Available Members (present today)
        </div>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No members marked present yet — mark attendance in the Attendance tab first.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                Drivers
                <span className="text-[10px] font-normal text-muted-foreground">({drivers.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {drivers.map((d) => (
                  <Badge
                    key={d.id}
                    variant="secondary"
                    className={
                      assignedDriverIds.has(d.id)
                        ? "opacity-35 line-through"
                        : ""
                    }
                  >
                    {nameMap[d.id] ?? d.full_name ?? "Member"}
                  </Badge>
                ))}
                {drivers.length === 0 && (
                  <span className="text-xs text-muted-foreground">None present</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                Crew
                <span className="text-[10px] font-normal text-muted-foreground">({crew.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {crew.map((c) => (
                  <Badge
                    key={c.id}
                    variant="outline"
                    className={
                      assignedCrewIds.has(c.id)
                        ? "opacity-35 line-through"
                        : ""
                    }
                  >
                    {nameMap[c.id] ?? c.full_name ?? "Member"}
                  </Badge>
                ))}
                {crew.length === 0 && (
                  <span className="text-xs text-muted-foreground">None present</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Step 3 — Wave grid */}
      {cfg ? (
        <Card className="p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Step 3 — Wave Grid
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={autoPair}
                disabled={busy || profiles.length === 0}
              >
                <Shuffle className="h-3.5 w-3.5 mr-1" />Auto-pair
              </Button>
              {slots.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAll}
                  disabled={busy}
                  className="text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Clear
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {Array.from({ length: cfg.waves_count }, (_, wi) => {
              const w = wi + 1;
              return (
                <div key={w}>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-accent mb-2">
                    Wave {w}
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: cfg.lanes_count }, (_, li) => {
                      const l = li + 1;
                      const slot = slotMap.get(`${w}:${l}`);
                      return (
                        <LaneSlot
                          key={l}
                          wave={w}
                          lane={l}
                          slot={slot ?? null}
                          drivers={drivers}
                          crew={crew}
                          assignedDriverIds={assignedDriverIds}
                          assignedCrewIds={assignedCrewIds}
                          nameMap={nameMap}
                          busy={busy}
                          onAssign={assignSlot}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          Set capacity above to create the wave grid.
        </Card>
      )}
    </div>
  );
}

function LaneSlot({
  wave, lane, slot, drivers, crew, assignedDriverIds, assignedCrewIds, nameMap, busy, onAssign,
}: {
  wave: number;
  lane: number;
  slot: SlotRow | null;
  drivers: MemberProfile[];
  crew: MemberProfile[];
  assignedDriverIds: Set<string>;
  assignedCrewIds: Set<string>;
  nameMap: Record<string, string>;
  busy: boolean;
  onAssign: (wave: number, lane: number, role: "driver_id" | "crew_id", memberId: string | null) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5 space-y-2">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase">Lane {lane}</div>
      <div className="grid grid-cols-2 gap-2">
        {/* Driver */}
        <Select
          value={slot?.driver_id ?? "__none"}
          onValueChange={(v) => onAssign(wave, lane, "driver_id", v === "__none" ? null : v)}
          disabled={busy}
        >
          <SelectTrigger className="h-9 text-xs">
            <span className="text-[9px] text-muted-foreground uppercase mr-1">D</span>
            <SelectValue placeholder="+ Driver" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— No driver</SelectItem>
            {drivers.map((d) => {
              const alreadyAssigned = assignedDriverIds.has(d.id) && slot?.driver_id !== d.id;
              return (
                <SelectItem key={d.id} value={d.id} disabled={alreadyAssigned}>
                  {nameMap[d.id] ?? d.full_name ?? "Member"}
                  {alreadyAssigned ? " (assigned)" : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Crew */}
        <Select
          value={slot?.crew_id ?? "__none"}
          onValueChange={(v) => onAssign(wave, lane, "crew_id", v === "__none" ? null : v)}
          disabled={busy}
        >
          <SelectTrigger className="h-9 text-xs">
            <span className="text-[9px] text-muted-foreground uppercase mr-1">C</span>
            <SelectValue placeholder="+ Crew" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— No crew</SelectItem>
            {crew.map((c) => {
              const alreadyAssigned = assignedCrewIds.has(c.id) && slot?.crew_id !== c.id;
              return (
                <SelectItem key={c.id} value={c.id} disabled={alreadyAssigned}>
                  {nameMap[c.id] ?? c.full_name ?? "Member"}
                  {alreadyAssigned ? " (assigned)" : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ReadOnlyGrid({
  cfg, slotMap, dn,
}: {
  cfg: Cfg;
  slotMap: Map<string, SlotRow>;
  dn: (id: string | null | undefined) => string;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: cfg.waves_count }, (_, wi) => {
        const w = wi + 1;
        return (
          <div key={w}>
            <div className="text-[11px] font-bold uppercase tracking-wide text-accent mb-2">Wave {w}</div>
            <div className="space-y-2">
              {Array.from({ length: cfg.lanes_count }, (_, li) => {
                const l = li + 1;
                const slot = slotMap.get(`${w}:${l}`);
                return (
                  <div key={l} className="rounded-lg border bg-card p-2.5">
                    <div className="text-[10px] text-muted-foreground mb-1.5 uppercase font-semibold">
                      Lane {l}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="truncate">
                        <span className="text-[9px] text-muted-foreground uppercase">D </span>
                        {slot?.driver_id ? (
                          <span className="font-medium">{dn(slot.driver_id)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="truncate">
                        <span className="text-[9px] text-muted-foreground uppercase">C </span>
                        {slot?.crew_id ? (
                          <span className="font-medium">{dn(slot.crew_id)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

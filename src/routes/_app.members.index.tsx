import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClub, useIsAdmin, useCanManage } from "@/lib/club-context";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { X, Trash2, Search, ChevronRight } from "lucide-react";
import { buildNameMap } from "@/lib/names";
import { roleBadgeClass, roleLabel } from "@/lib/role-colors";
import { InviteCodeCard } from "@/components/members/InviteCodeCard";

export const Route = createFileRoute("/_app/members/")({
  head: () => ({ meta: [{ title: "Members — IRB Coaching" }] }),
  component: MembersPage,
});


type Row = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  profile: {
    full_name: string | null;
    phone: string | null;
    age_division: string | null;
    preferred_roles: string[];
  } | null;
};


type Partner = { id: string; driver_id: string; crew_id: string };

function MembersPage() {
  const { activeClub } = useClub();
  const isAdmin = useIsAdmin();
  const canManage = useCanManage();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [partners, setPartners] = useState<Partner[]>([]);

  const load = useCallback(async () => {
    if (!activeClub) return;
    const { data: mems } = await supabase
      .from("club_memberships")
      .select("id, user_id, status")
      .eq("club_id", activeClub.club_id)
      .order("status");

    const userIds = (mems ?? []).map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles")
          .select("id, full_name, phone, age_division, preferred_roles")
          .in("id", userIds)
      : { data: [] as { id: string; full_name: string | null; phone: string | null; age_division: string | null; preferred_roles: string[] }[] };
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

    setRows(
      (mems ?? []).map((m) => {
        const pr = pmap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          status: m.status as Row["status"],
          profile: pr
            ? {
                full_name: pr.full_name,
                phone: pr.phone,
                age_division: pr.age_division,
                preferred_roles: pr.preferred_roles ?? [],
              }
            : null,
        };
      }),
    );


    const { data: r } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("club_id", activeClub.club_id);
    const map: Record<string, string[]> = {};
    (r ?? []).forEach((x) => {
      map[x.user_id] = [...(map[x.user_id] ?? []), x.role];
    });
    setRoles(map);

    const { data: pp } = await supabase
      .from("member_partners")
      .select("id, driver_id, crew_id")
      .eq("club_id", activeClub.club_id);
    setPartners((pp ?? []) as Partner[]);
  }, [activeClub?.club_id]);


  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: Row["status"]) => {
    const { error } = await supabase.from("club_memberships").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Member approved" : "Updated");
    load();
  };

  const removeMember = async (membershipId: string, userId: string) => {
    await supabase.from("user_roles").delete().eq("club_id", activeClub!.club_id).eq("user_id", userId);
    const { error } = await supabase.from("club_memberships").delete().eq("id", membershipId);
    if (error) { toast.error(error.message); return; }
    toast.success("Member removed");
    load();
  };

  if (!activeClub) return null;

  const nameMap = buildNameMap(
    rows.map((r) => ({ id: r.user_id, full_name: r.profile?.full_name ?? null })),
    "Unnamed",
  );
  const display = (id: string) => nameMap[id] || "Unnamed";
  const byName = (a: Row, b: Row) => display(a.user_id).localeCompare(display(b.user_id));

  // Partner index: user_id -> first partner user_id (for "partner name" display)
  const partnerOf: Record<string, string | undefined> = {};
  partners.forEach((p) => {
    if (!partnerOf[p.driver_id]) partnerOf[p.driver_id] = p.crew_id;
    if (!partnerOf[p.crew_id]) partnerOf[p.crew_id] = p.driver_id;
  });

  return (
    <MembersPageInner
      rows={rows}
      roles={roles}
      partners={partners}
      partnerOf={partnerOf}
      display={display}
      byName={byName}
      activeClubId={activeClub.club_id}
      currentUserId={me}
      canManage={canManage}
      isAdmin={isAdmin}
      setStatus={setStatus}
      removeMember={removeMember}
      load={load}
    />
  );
}

function MembersPageInner({
  rows, roles, partners, partnerOf, display, byName,
  activeClubId, currentUserId, canManage, isAdmin,
  setStatus, removeMember, load,
}: {
  rows: Row[];
  roles: Record<string, string[]>;
  partners: Partner[];
  partnerOf: Record<string, string | undefined>;
  display: (id: string) => string;
  byName: (a: Row, b: Row) => number;
  activeClubId: string;
  currentUserId: string | null;
  canManage: boolean;
  isAdmin: boolean;
  setStatus: (id: string, status: Row["status"]) => void;
  removeMember: (membershipId: string, userId: string) => void;
  load: () => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const pending = useMemo(() => rows.filter((r) => r.status === "pending").sort(byName), [rows, byName]);
  const approved = useMemo(() => rows.filter((r) => r.status === "approved").sort(byName), [rows, byName]);

  const filteredApproved = useMemo(() => {
    const q = search.trim().toLowerCase();
    return approved.filter((r) => {
      if (q) {
        const name = display(r.user_id).toLowerCase();
        const phone = (r.profile?.phone ?? "").toLowerCase();
        if (!name.includes(q) && !phone.includes(q)) return false;
      }
      if (roleFilter !== "all") {
        const rs = roles[r.user_id] ?? [];
        const prefs = (r.profile?.preferred_roles ?? []).map((x) => x.toLowerCase());
        const combined = [...rs.map((x) => x.toLowerCase()), ...prefs];
        if (!combined.includes(roleFilter)) return false;
      }
      return true;
    });
  }, [approved, search, roleFilter, roles, display]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Members</h1>

      <div className="mb-4">
        <InviteCodeCard clubId={activeClubId} canManage={canManage} currentUserId={currentUserId} />
      </div>

      <Tabs defaultValue="approved">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending {pending.length > 0 && `(${pending.length})`}</TabsTrigger>
          <TabsTrigger value="partners">Partners ({partners.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="approved" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="pl-9 h-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="club_admin">Admin</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="crew">Crew</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredApproved.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              {approved.length === 0 ? "No approved members yet." : "No members match your filters."}
            </Card>
          )}
          {filteredApproved.map((m) => (
            <MemberRow
              key={m.id}
              row={m}
              displayName={display(m.user_id)}
              partnerName={partnerOf[m.user_id] ? display(partnerOf[m.user_id]!) : null}
              roles={roles[m.user_id] ?? []}
              canManage={canManage}
              canRemove={isAdmin}
              onRemove={() => removeMember(m.id, m.user_id)}
              onChange={load}
            />
          ))}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-2">
          {pending.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">No pending requests.</Card>
          )}
          {pending.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar><AvatarFallback>{initials(m.profile?.full_name)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{display(m.user_id)}</div>
                  {m.profile?.phone && <div className="text-xs text-muted-foreground truncate">{m.profile.phone}</div>}
                </div>
              </div>
              {isAdmin && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => setStatus(m.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "rejected")}>Reject</Button>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="partners" className="mt-4 space-y-3">
          <PartnersPanel
            clubId={activeClubId}
            approved={approved}
            partners={partners}
            canManageAll={canManage}
            currentUserId={currentUserId}
            nameOf={display}
            onChange={load}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}


function PartnersPanel({
  clubId, approved, partners, canManageAll, currentUserId, nameOf, onChange,
}: {
  clubId: string;
  approved: Row[];
  partners: Partner[];
  canManageAll: boolean;
  currentUserId: string | null;
  nameOf: (id: string) => string;
  onChange: () => void;
}) {
  const [driver, setDriver] = useState(canManageAll ? "" : (currentUserId ?? ""));
  const [crew, setCrew] = useState("");

  const pairExists = (a: string, b: string) =>
    partners.some(
      (p) =>
        (p.driver_id === a && p.crew_id === b) ||
        (p.driver_id === b && p.crew_id === a),
    );

  const addPair = async () => {
    if (!driver || !crew || driver === crew) return;
    if (pairExists(driver, crew)) { toast.info("That pair already exists"); return; }
    // Enforce one partner per member: remove any existing pairs for driver or crew
    const driverPair = partners.find((p) => p.driver_id === driver || p.crew_id === driver);
    const crewPair = partners.find((p) => p.driver_id === crew || p.crew_id === crew);
    const toDelete = [...new Set([driverPair?.id, crewPair?.id].filter(Boolean) as string[])];
    for (const id of toDelete) {
      await supabase.from("member_partners").delete().eq("id", id);
    }
    const { error } = await supabase.from("member_partners").insert({
      club_id: clubId, driver_id: driver, crew_id: crew,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Pair created");
    if (canManageAll) setDriver("");
    setCrew("");
    onChange();
  };

  const removePair = async (id: string) => {
    const { error } = await supabase.from("member_partners").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  const pairKey = (p: Partner) =>
    [nameOf(p.driver_id), nameOf(p.crew_id)].sort().join("|");
  const sortedPartners = [...partners].sort((a, b) => pairKey(a).localeCompare(pairKey(b)));
  const myPairs = currentUserId
    ? sortedPartners.filter((p) => p.driver_id === currentUserId || p.crew_id === currentUserId)
    : [];
  const otherPairs = sortedPartners.filter((p) => !myPairs.includes(p));
  const canRemove = (p: Partner) =>
    canManageAll || p.driver_id === currentUserId || p.crew_id === currentUserId;

  // For members: driver locked to themselves, crew = any other approved member
  // For admins/coaches: free choice of both
  const driverOptions = canManageAll
    ? approved
    : approved.filter((r) => r.user_id === currentUserId);
  const crewOptions = approved.filter((r) => r.user_id !== driver);

  return (
    <>
      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold">
          {canManageAll ? "Create partner pair" : "Add a teammate"}
        </div>
        <p className="text-xs text-muted-foreground">
          You can pair with multiple people — add one pair at a time.
        </p>
        <Select value={driver} onValueChange={setDriver} disabled={!canManageAll}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Driver…" /></SelectTrigger>
          <SelectContent>
            {driverOptions.map((r) => (
              <SelectItem key={r.user_id} value={r.user_id} disabled={r.user_id === crew}>
                {nameOf(r.user_id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={crew} onValueChange={setCrew}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Teammate…" /></SelectTrigger>
          <SelectContent>
            {crewOptions.map((r) => (
              <SelectItem key={r.user_id} value={r.user_id} disabled={r.user_id === driver}>
                {nameOf(r.user_id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={addPair} disabled={!driver || !crew} className="w-full">Pair</Button>
      </Card>

      {myPairs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            My pairs ({myPairs.length})
          </div>
          {myPairs.map((p) => (
            <PairRow key={p.id} p={p} nameOf={nameOf} canRemove={canRemove(p)} onRemove={() => removePair(p.id)} />
          ))}
        </div>
      )}

      {otherPairs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Other pairs ({otherPairs.length})
          </div>
          {otherPairs.map((p) => (
            <PairRow key={p.id} p={p} nameOf={nameOf} canRemove={canRemove(p)} onRemove={() => removePair(p.id)} />
          ))}
        </div>
      )}

      {partners.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">No partner pairs yet.</Card>
      )}
    </>
  );
}

function PairRow({ p, nameOf, canRemove, onRemove }: {
  p: Partner; nameOf: (id: string) => string; canRemove: boolean; onRemove: () => void;
}) {
  return (
    <Card className="p-3 flex items-center justify-between gap-2">
      <div className="text-sm">
        <span className="font-medium">{nameOf(p.driver_id)}</span>
        <span className="text-muted-foreground"> driver · </span>
        <span className="font-medium">{nameOf(p.crew_id)}</span>
        <span className="text-muted-foreground"> crew</span>
      </div>
      {canRemove && (
        <Button size="icon" variant="ghost" onClick={onRemove}>
          <X className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </Card>
  );
}

const ROLE_OPTIONS = ["Driver", "Crew", "Patient"] as const;

function MemberRow({ row, displayName, partnerName, roles, canManage, canRemove, onRemove, onChange }: {
  row: Row; displayName: string; partnerName: string | null; roles: string[]; canManage: boolean; canRemove?: boolean; onRemove?: () => void; onChange: () => void;
}) {
  const pr = row.profile?.preferred_roles ?? [];
  const age = row.profile?.age_division;
  const [saving, setSaving] = useState(false);

  const toggle = async (role: string) => {
    setSaving(true);
    const next = pr.includes(role) ? pr.filter((r) => r !== role) : [...pr, role];
    const { error } = await supabase.from("profiles")
      .update({ preferred_roles: next }).eq("id", row.user_id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  // Color-coded role badges combine club role(s) + preferred roles, deduped case-insensitively.
  const combinedRoles: string[] = [];
  [...roles, ...pr].forEach((r) => {
    if (!combinedRoles.find((x) => x.toLowerCase() === r.toLowerCase())) combinedRoles.push(r);
  });
  if (combinedRoles.length === 0) combinedRoles.push("member");

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <Link to="/members/$memberId" params={{ memberId: row.user_id }} className="flex items-center gap-3 flex-1 min-w-0 group">
          <Avatar><AvatarFallback>{initials(row.profile?.full_name)}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate group-hover:underline">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {partnerName ? (
                <>Partner: <span className="text-foreground">{partnerName}</span></>
              ) : (
                <span className="italic">Unpaired</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {combinedRoles.map((r) => (
                <Badge key={r} className={`text-[10px] uppercase ${roleBadgeClass(r)}`}>
                  {roleLabel(r)}
                </Badge>
              ))}
              {age && <Badge variant="outline" className="text-[10px] uppercase">{age.replace("_", " ")}</Badge>}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
        {canRemove && onRemove && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove member?</AlertDialogTitle>
                <AlertDialogDescription>
                  {displayName} will lose access to the club. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {canManage && (
        <div className="mt-3 flex gap-1.5">
          {ROLE_OPTIONS.map((role) => {
            const active = pr.includes(role);
            return (
              <Button
                key={role}
                size="sm"
                variant={active ? "default" : "outline"}
                className="flex-1 h-8 text-xs"
                disabled={saving}
                onClick={() => toggle(role)}
              >
                {role}
              </Button>
            );
          })}
        </div>
      )}
    </Card>
  );
}


function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}


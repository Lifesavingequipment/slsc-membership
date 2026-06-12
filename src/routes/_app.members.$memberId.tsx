import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useClub, useCanManage, useIsAdmin } from "@/lib/club-context";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Trash2, Phone, Users, Pencil, Search, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { buildNameMap } from "@/lib/names";
import { roleBadgeClass, roleLabel } from "@/lib/role-colors";

export const Route = createFileRoute("/_app/members/$memberId")({
  head: () => ({ meta: [{ title: "Member — IRB Coaching" }] }),
  component: MemberDetail,
});

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  age_division: string | null;
  preferred_roles: string[];
};

type Partner = { id: string; driver_id: string; crew_id: string };

function MemberDetail() {
  const { memberId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeClub } = useClub();
  const canManage = useCanManage();
  const isAdmin = useIsAdmin();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<Profile[]>([]);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Partner dialog state
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [selfRole, setSelfRole] = useState<"driver" | "crew">("driver");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [overwritePairId, setOverwritePairId] = useState<string | null>(null);

  const isSelf = user?.id === memberId;
  const clubId = activeClub?.club_id ?? null;

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setLoadError(null);
    const [pRes, rRes, ppRes, mRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, phone, gender, age_division, preferred_roles")
        .eq("id", memberId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", memberId),
      supabase
        .from("member_partners")
        .select("id, driver_id, crew_id")
        .eq("club_id", clubId)
        .or(`driver_id.eq.${memberId},crew_id.eq.${memberId}`)
        .limit(1),
      supabase
        .from("club_memberships")
        .select("id")
        .eq("club_id", clubId)
        .eq("user_id", memberId)
        .maybeSingle(),
    ]);
    if (pRes.error) {
      setLoadError(pRes.error.message);
      setLoading(false);
      return;
    }
    if (!pRes.data) {
      setLoadError("Member not found or not accessible.");
      setLoading(false);
      return;
    }
    setProfile(pRes.data as Profile);
    setRoles(((rRes.data as { role: string }[] | null) ?? []).map((r) => r.role));
    setPartners((ppRes.data as Partner[] | null) ?? []);
    setMembershipId((mRes.data?.id as string | undefined) ?? null);

    const { data: mems } = await supabase
      .from("club_memberships")
      .select("user_id")
      .eq("club_id", clubId)
      .eq("status", "approved");
    const ids = (mems ?? []).map((m) => m.user_id).filter((id) => id !== memberId);
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone, gender, age_division, preferred_roles")
        .in("id", ids);
      setOtherProfiles((profs as Profile[] | null) ?? []);
    } else {
      setOtherProfiles([]);
    }
    setLoading(false);
  }, [clubId, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const nameMap = useMemo(() => {
    const all = [
      ...(profile ? [profile] : []),
      ...otherProfiles,
    ].map((p) => ({ id: p.id, full_name: p.full_name }));
    return buildNameMap(all, "Unnamed");
  }, [profile, otherProfiles]);
  const dn = (id: string) => nameMap[id] || "Unnamed";

  // Current partner (at most one row)
  const currentPair = partners[0] ?? null;
  const currentPartnerId = currentPair
    ? currentPair.driver_id === memberId
      ? currentPair.crew_id
      : currentPair.driver_id
    : null;
  const currentPairRole = currentPair
    ? currentPair.driver_id === memberId
      ? "driver"
      : "crew"
    : null;

  // Derive whether this member prefers driver / crew role
  const memberRoles = useMemo(() => {
    const all = [...roles, ...(profile?.preferred_roles ?? [])].map((r) => r.toLowerCase());
    return { isDriver: all.includes("driver"), isCrew: all.includes("crew") };
  }, [roles, profile]);

  const openPartnerDialog = () => {
    setPickedId(null);
    setPartnerSearch("");
    setOverwritePairId(null);
    // Default role: driver if they prefer driving, otherwise crew, otherwise driver
    setSelfRole(memberRoles.isDriver ? "driver" : memberRoles.isCrew ? "crew" : "driver");
    setPartnerDialogOpen(true);
  };

  const savePartner = async () => {
    if (!clubId || !pickedId) return;
    // Check if picked member already has a preferred partner
    const { data: existingPairs } = await supabase
      .from("member_partners")
      .select("id")
      .eq("club_id", clubId)
      .or(`driver_id.eq.${pickedId},crew_id.eq.${pickedId}`)
      .limit(1);
    if (existingPairs && existingPairs.length > 0) {
      setOverwritePairId(existingPairs[0].id as string);
      return;
    }
    await commitPartner();
  };

  const commitPartner = async () => {
    if (!clubId || !pickedId) return;
    setBusy(true);
    // Remove current pair for this member (if any)
    if (currentPair) {
      await supabase.from("member_partners").delete().eq("id", currentPair.id);
    }
    // Remove existing pair of the picked member (if we confirmed overwrite)
    if (overwritePairId) {
      await supabase.from("member_partners").delete().eq("id", overwritePairId);
    }
    const { error } = await supabase.from("member_partners").insert({
      club_id: clubId,
      driver_id: selfRole === "driver" ? memberId : pickedId,
      crew_id: selfRole === "crew" ? memberId : pickedId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Preferred partner set");
    setPartnerDialogOpen(false);
    setOverwritePairId(null);
    load();
  };

  const removePartner = async () => {
    if (!currentPair) return;
    const { error } = await supabase.from("member_partners").delete().eq("id", currentPair.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Partner removed");
    load();
  };

  const removeMember = async () => {
    if (!clubId || !membershipId) return;
    setBusy(true);
    await supabase.from("user_roles").delete().eq("club_id", clubId).eq("user_id", memberId);
    const { error } = await supabase.from("club_memberships").delete().eq("id", membershipId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Member removed");
    navigate({ to: "/members" });
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }
  if (!profile) {
    return (
      <AppShell>
        <Link to="/members" className="inline-flex items-center text-sm text-muted-foreground mb-2">
          <ChevronLeft className="h-4 w-4" /> Members
        </Link>
        <Card className="p-6 text-center">
          <p className="text-sm font-medium">Couldn't load this member</p>
          <p className="text-xs text-muted-foreground mt-1">{loadError ?? "Unknown error"}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button>
        </Card>
      </AppShell>
    );
  }

  const allRoles = [...roles];
  profile.preferred_roles?.forEach((r) => {
    if (!allRoles.find((x) => x.toLowerCase() === r.toLowerCase())) allRoles.push(r);
  });

  const isDual = memberRoles.isDriver && memberRoles.isCrew;
  const isNeitherRole = !memberRoles.isDriver && !memberRoles.isCrew;

  const filteredOptions = otherProfiles
    .filter((p) => {
      const q = partnerSearch.trim().toLowerCase();
      return !q || (p.full_name ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => dn(a.id).localeCompare(dn(b.id)));

  const canEditPartner = isSelf || canManage;

  return (
    <AppShell>
      <Link to="/members" className="inline-flex items-center text-sm text-muted-foreground mb-2">
        <ChevronLeft className="h-4 w-4" /> Members
      </Link>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{dn(profile.id)}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allRoles.length === 0 ? (
                <Badge variant="secondary" className="text-[10px] uppercase">Member</Badge>
              ) : (
                allRoles.map((r) => (
                  <Badge key={r} className={`text-[10px] uppercase ${roleBadgeClass(r)}`}>
                    {roleLabel(r)}
                  </Badge>
                ))
              )}
              {profile.age_division && (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {profile.age_division.replace("_", " ")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {profile.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <a href={`tel:${profile.phone}`} className="hover:underline">{profile.phone}</a>
            </div>
          )}
          {profile.gender && (
            <div className="text-muted-foreground">
              <span className="text-xs uppercase tracking-wide mr-2">Gender</span>{profile.gender}
            </div>
          )}
        </div>

        {(isSelf || canManage) && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/members/$memberId/edit" params={{ memberId }}>
                <Pencil className="h-4 w-4 mr-1.5" /> {isSelf ? "Edit my profile" : "Edit member"}
              </Link>
            </Button>
            {canManage && !isSelf && profile.phone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${profile.phone}`}><Phone className="h-4 w-4 mr-1.5" /> Call</a>
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Preferred partner card */}
      <Card className="p-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">Preferred partner</div>
        </div>

        {currentPartnerId ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(dn(currentPartnerId))}</AvatarFallback>
              </Avatar>
              <div>
                <Link
                  to="/members/$memberId"
                  params={{ memberId: currentPartnerId }}
                  className="text-sm font-medium hover:underline"
                >
                  {dn(currentPartnerId)}
                </Link>
                {currentPairRole && (
                  <div className="text-[11px] text-muted-foreground">
                    {dn(profile.id)} is {currentPairRole}
                  </div>
                )}
              </div>
            </div>
            {canEditPartner && (
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="outline" onClick={openPartnerDialog}>
                  Change
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={removePartner}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">No preferred partner set.</p>
            {canEditPartner && (
              <Button size="sm" onClick={openPartnerDialog}>
                Set partner
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Set / change partner dialog */}
      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {currentPartnerId ? "Change preferred partner" : "Set preferred partner"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                placeholder="Search members…"
                className="pl-9 h-9"
              />
            </div>

            {/* Member list */}
            <div className="max-h-52 overflow-y-auto space-y-1 -mx-1 px-1">
              {filteredOptions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No members found.</p>
              )}
              {filteredOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPickedId(p.id)}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                    pickedId === p.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px]">{initials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  {dn(p.id)}
                </button>
              ))}
            </div>

            {/* Role picker — shown if member has both roles or neither */}
            {(isDual || isNeitherRole) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {dn(profile.id)} will be
                </p>
                <RadioGroup
                  value={selfRole}
                  onValueChange={(v) => setSelfRole(v as "driver" | "crew")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="driver" id="role-driver" />
                    <Label htmlFor="role-driver" className="cursor-pointer">Driver</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="crew" id="role-crew" />
                    <Label htmlFor="role-crew" className="cursor-pointer">Crew</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPartnerDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePartner} disabled={!pickedId || busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite warning */}
      <AlertDialog open={!!overwritePairId} onOpenChange={(open) => { if (!open) setOverwritePairId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing partner?</AlertDialogTitle>
            <AlertDialogDescription>
              {pickedId ? dn(pickedId) : "This member"} already has a preferred partner. Setting this
              pair will remove their existing one. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOverwritePairId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={commitPartner}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAdmin && !isSelf && membershipId && (
        <div className="mt-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Remove member
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove member?</AlertDialogTitle>
                <AlertDialogDescription>
                  {dn(profile.id)} will lose access to the club. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={removeMember}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </AppShell>
  );
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

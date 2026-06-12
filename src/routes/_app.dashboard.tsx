import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, isAfter } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useClub, useCanManage, useIsAdmin } from "@/lib/club-context";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Users, ShieldCheck, Shield } from "lucide-react";
import { useIsPlatformOwner } from "@/lib/platform-owner";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — IRB Coaching" }] }),
  component: Dashboard,
});

type Upcoming = {
  id: string; title: string; starts_at: string; location: string | null; session_type: string;
};

function Dashboard() {
  const { user } = useAuth();
  const { activeClub } = useClub();
  const canManage = useCanManage();
  const isAdmin = useIsAdmin();
  const isPlatformOwner = useIsPlatformOwner();

  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [myRsvps, setMyRsvps] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activeClub || !user) return;
    const nowIso = new Date().toISOString();
    (async () => {
      const [sess, members, pending, rsvps] = await Promise.all([
        supabase.from("sessions")
          .select("id, title, starts_at, location, session_type")
          .eq("club_id", activeClub.club_id)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(5),
        supabase.from("club_memberships").select("id", { count: "exact", head: true })
          .eq("club_id", activeClub.club_id).eq("status", "approved"),
        supabase.from("club_memberships").select("id", { count: "exact", head: true })
          .eq("club_id", activeClub.club_id).eq("status", "pending"),
        supabase.from("session_rsvps").select("session_id, status").eq("user_id", user.id),
      ]);
      setUpcoming((sess.data ?? []) as Upcoming[]);
      setMemberCount(members.count ?? 0);
      setPendingCount(pending.count ?? 0);
      const map: Record<string, string> = {};
      (rsvps.data ?? []).forEach((r) => { map[r.session_id] = r.status; });
      setMyRsvps(map);
    })();
  }, [activeClub?.club_id, user?.id]);

  if (!activeClub) return null;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-bold tracking-tight">{activeClub.club.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Users className="h-3.5 w-3.5" /> Members
          </div>
          <div className="mt-1 text-2xl font-bold">{memberCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Calendar className="h-3.5 w-3.5" /> Upcoming
          </div>
          <div className="mt-1 text-2xl font-bold">{upcoming.length}</div>
        </Card>
      </div>

      {isPlatformOwner && (
        <Card className="mb-3 p-3 border-primary/40 bg-primary/5">
          <Link to="/admin" className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Platform admin</div>
              <p className="text-xs text-muted-foreground">Stats across every club, manage owners, email coaches.</p>
            </div>
            <Button size="sm" variant="secondary">Open</Button>
          </Link>
        </Card>
      )}

      {isAdmin && pendingCount > 0 && (
        <Card className="mb-5 p-4 border-warning/40 bg-warning/10">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">{pendingCount} join request{pendingCount === 1 ? "" : "s"} waiting</div>
              <p className="text-sm text-muted-foreground">Review and approve members.</p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link to="/members">Review</Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Upcoming sessions</h2>
        {canManage && (
          <Button asChild size="sm" variant="ghost" className="text-accent">
            <Link to="/sessions/new"><Plus className="h-4 w-4 mr-1" /> New</Link>
          </Button>
        )}
      </div>

      {upcoming.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
          {canManage && (
            <Button asChild className="mt-3"><Link to="/sessions/new">Schedule one</Link></Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {upcoming.map((s) => (
            <Link key={s.id} to="/sessions/$sessionId" params={{ sessionId: s.id }}>
              <Card className="p-4 hover:border-accent transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] uppercase">{s.session_type}</Badge>
                      {myRsvps[s.id] === "going" && (
                        <Badge className="bg-success text-success-foreground text-[10px] uppercase">Going</Badge>
                      )}
                    </div>
                    <div className="font-semibold truncate">{s.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(s.starts_at), "EEE d MMM · h:mma")}
                      </span>
                      {s.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" /> {s.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

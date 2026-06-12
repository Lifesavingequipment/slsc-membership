import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useClub, useCanManage } from "@/lib/club-context";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Users } from "lucide-react";

export const Route = createFileRoute("/_app/sessions/")({
  head: () => ({ meta: [{ title: "Sessions — IRB Coaching" }] }),
  component: SessionsList,
});

type Row = {
  id: string; title: string; starts_at: string; location: string | null;
  session_type: string; format: string | null;
};


function SessionsList() {
  const { activeClub } = useClub();
  const { user } = useAuth();
  const canManage = useCanManage();
  const [rows, setRows] = useState<Row[]>([]);
  const [myRsvps, setMyRsvps] = useState<Record<string, string>>({});
  const [goingCounts, setGoingCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (!activeClub || !user) return;
    const nowIso = new Date().toISOString();
    (async () => {
      const q = supabase
        .from("sessions")
        .select("id, title, starts_at, location, session_type, format")
        .eq("club_id", activeClub.club_id);
      const { data } = tab === "upcoming"
        ? await q.gte("starts_at", nowIso).order("starts_at", { ascending: true })
        : await q.lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(50);
      const list = (data ?? []) as Row[];
      setRows(list);
      const ids = list.map((r) => r.id);
      const [{ data: rsvps }, { data: counts }] = await Promise.all([
        supabase.from("session_rsvps").select("session_id, status").eq("user_id", user.id),
        ids.length
          ? supabase.from("session_rsvps").select("session_id").in("session_id", ids).eq("status", "going")
          : Promise.resolve({ data: [] as { session_id: string }[] }),
      ]);
      const map: Record<string, string> = {};
      (rsvps ?? []).forEach((r) => { map[r.session_id] = r.status; });
      setMyRsvps(map);
      const cmap: Record<string, number> = {};
      (counts ?? []).forEach((r) => { cmap[r.session_id] = (cmap[r.session_id] ?? 0) + 1; });
      setGoingCounts(cmap);
    })();
  }, [activeClub?.club_id, user?.id, tab]);


  return (
    <AppShell
      action={canManage ? (
        <Button asChild size="sm" variant="secondary" className="h-9">
          <Link to="/sessions/new"><Plus className="h-4 w-4 mr-1" /> New</Link>
        </Button>
      ) : undefined}
    >
      <h1 className="text-2xl font-bold mb-3">Sessions</h1>
      <div className="inline-flex bg-muted rounded-full p-1 mb-4">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full capitalize ${
              tab === t ? "bg-card shadow text-foreground" : "text-muted-foreground"
            }`}
          >{t}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No {tab} sessions.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <Link key={s.id} to="/sessions/$sessionId" params={{ sessionId: s.id }}>
              <Card className="p-4 hover:border-accent transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px] uppercase">{s.session_type}</Badge>
                  {s.format && (
                    <Badge variant="outline" className="text-[10px] uppercase">{s.format}</Badge>
                  )}
                  {myRsvps[s.id] === "going" && (
                    <Badge className="bg-success text-success-foreground text-[10px] uppercase">Going</Badge>
                  )}
                  {myRsvps[s.id] === "maybe" && (
                    <Badge className="bg-warning text-warning-foreground text-[10px] uppercase">Maybe</Badge>
                  )}
                </div>
                <div className="font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(s.starts_at), "EEE d MMM · h:mma")}
                  </span>
                  {s.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {s.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {goingCounts[s.id] ?? 0} going
                  </span>
                </div>

              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

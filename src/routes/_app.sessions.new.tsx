import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useClub, useCanManage } from "@/lib/club-context";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sessions/new")({
  head: () => ({ meta: [{ title: "New session — IRB Coaching" }] }),
  component: NewSession,
});

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  session_type: z.enum(["training", "fitness", "theory", "other"]),
  format: z.enum(["team", "individual"]),
  repeat_frequency: z.enum(["none", "daily", "weekly", "fortnightly", "monthly"]),
  location_id: z.string().uuid().optional(),
  location: z.string().trim().max(200).optional(),
  starts_at: z.string().min(1),
  ends_at: z.string().optional(),
  rsvp_deadline: z.string().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  survey_enabled: z.boolean(),
  carpool_enabled: z.boolean(),
});

type Loc = { id: string; name: string; address: string | null };

function NewSession() {
  const { user } = useAuth();
  const { activeClub } = useClub();
  const canManage = useCanManage();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"training" | "fitness" | "theory" | "other">("training");
  const [format, setFormat] = useState<"team" | "individual">("team");
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly" | "fortnightly" | "monthly">("none");
  const [locations, setLocations] = useState<Loc[]>([]);
  const [locationId, setLocationId] = useState<string>("custom");
  const [customLocation, setCustomLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [capacity, setCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [survey, setSurvey] = useState(false);
  const [carpool, setCarpool] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeClub) return;
    (async () => {
      const { data } = await supabase
        .from("locations")
        .select("id, name, address")
        .eq("club_id", activeClub.club_id)
        .order("name");
      setLocations((data ?? []) as Loc[]);
    })();
  }, [activeClub?.club_id]);

  if (!canManage) {
    return (
      <AppShell>
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Only coaches and admins can create sessions.
        </Card>
      </AppShell>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClub) return;

    const usingSaved = locationId !== "custom" && locationId !== "";
    const savedLoc = usingSaved ? locations.find((l) => l.id === locationId) : null;
    const locationText = usingSaved
      ? (savedLoc ? [savedLoc.name, savedLoc.address].filter(Boolean).join(" — ") : "")
      : customLocation;

    const parsed = schema.safeParse({
      title, session_type: type, format, repeat_frequency: repeat,
      location_id: usingSaved ? locationId : undefined,
      location: locationText || undefined,
      starts_at: startsAt,
      ends_at: endsAt || undefined,
      rsvp_deadline: rsvpDeadline || undefined,
      capacity: capacity ? Number(capacity) : undefined,
      notes,
      survey_enabled: survey,
      carpool_enabled: carpool,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    setBusy(true);
    const { error } = await supabase.from("sessions").insert({
      club_id: activeClub.club_id,
      title: parsed.data.title,
      session_type: parsed.data.session_type,
      format: parsed.data.format,
      repeat_frequency: parsed.data.repeat_frequency,
      location: parsed.data.location || null,
      location_id: parsed.data.location_id ?? null,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at).toISOString() : null,
      rsvp_deadline: parsed.data.rsvp_deadline ? new Date(parsed.data.rsvp_deadline).toISOString() : null,
      capacity: parsed.data.capacity ?? null,
      notes: parsed.data.notes || null,
      survey_enabled: parsed.data.survey_enabled,
      carpool_enabled: parsed.data.carpool_enabled,
      created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Session created");
    navigate({ to: "/sessions" });
  };

  const addLocation = async () => {
    if (!activeClub) return;
    const name = prompt("Location name (e.g. North Beach)")?.trim();
    if (!name) return;
    const address = prompt("Address (optional)")?.trim() || null;
    const { data, error } = await supabase.from("locations")
      .insert({ club_id: activeClub.club_id, name, address, created_by: user?.id ?? null })
      .select("id, name, address")
      .single();
    if (error) { toast.error(error.message); return; }
    setLocations((prev) => [...prev, data as Loc].sort((a, b) => a.name.localeCompare(b.name)));
    setLocationId(data!.id);
    toast.success("Location saved");
  };

  return (
    <AppShell>
      <Link to="/sessions" className="inline-flex items-center text-sm text-muted-foreground mb-2">
        <ChevronLeft className="h-4 w-4" /> Sessions
      </Link>
      <h1 className="text-2xl font-bold mb-4">New session</h1>
      <Card className="p-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday IRB training" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="theory">Theory</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue placeholder="Choose location" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}{l.address ? ` — ${l.address}` : ""}</SelectItem>
                ))}
                <SelectItem value="custom">Custom address…</SelectItem>
              </SelectContent>
            </Select>
            {locationId === "custom" ? (
              <Input
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Type address or place name"
              />
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={addLocation} className="h-7 px-2 text-xs">
                + Save a new location
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="starts">Starts</Label>
              <Input id="starts" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ends">Ends</Label>
              <Input id="ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rsvp">RSVP deadline</Label>
            <Input id="rsvp" type="datetime-local" value={rsvpDeadline} onChange={(e) => setRsvpDeadline(e.target.value)} />
            <p className="text-xs text-muted-foreground">After this time, members can't change their response.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Repeat</Label>
            <Select value={repeat} onValueChange={(v) => setRepeat(v as typeof repeat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Doesn't repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cap">Capacity</Label>
            <Input id="cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Optional" />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Post-session survey</div>
              <p className="text-xs text-muted-foreground">Ask attendees for feedback afterwards.</p>
            </div>
            <Switch checked={survey} onCheckedChange={setSurvey} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Carpool</div>
              <p className="text-xs text-muted-foreground">Let members coordinate rides.</p>
            </div>
            <Switch checked={carpool} onCheckedChange={setCarpool} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" disabled={busy} className="w-full h-11">
            {busy ? "Creating..." : "Create session"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}

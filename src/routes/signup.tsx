import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — IRB Coaching" }] }),
  component: SignupPage,
});

const schema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(60),
  last_name: z.string().trim().min(1, "Last name required").max(60),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(5, "Phone required").max(30),
  date_of_birth: z.string().min(1, "Date of birth required"),
  gender: z.string().min(1, "Select an option"),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const invite = new URLSearchParams(window.location.search).get("invite");
    if (invite) sessionStorage.setItem("pending_invite_code", invite.toUpperCase());
  }, []);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      first_name: firstName, last_name: lastName, email, phone,
      date_of_birth: dob, gender, password,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const full_name = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name, phone: parsed.data.phone },
      },
    });
    if (error) { setBusy(false); toast.error(error.message); return; }

    // If auto-confirm is on, session exists — write the full profile.
    if (data.user) {
      await supabase.from("profiles").update({
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        full_name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        date_of_birth: parsed.data.date_of_birth,
        gender: parsed.data.gender,
      }).eq("id", data.user.id);
    }

    setBusy(false);
    if (data.session) {
      toast.success("Account created.");
      // Auth listener will set `user`; the useEffect above navigates to /dashboard,
      // and the _app gate will route to /onboarding if no club is joined yet.
    } else {
      toast.success("Account created. Check your email to confirm.");
      navigate({ to: "/login", replace: true });
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join your club and start RSVPing to sessions."
      footer={<>Already a member? <Link to="/login" className="text-accent font-medium">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first">First name</Label>
            <Input id="first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last">Last name</Label>
            <Input id="last" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
        </div>
        <Button type="submit" className="w-full h-12 text-base" disabled={busy}>
          {busy ? "Creating..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}

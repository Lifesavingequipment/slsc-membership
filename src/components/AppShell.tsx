import { Link, useLocation } from "@tanstack/react-router";
import { Home, Calendar, Users, Settings, Waves, ChevronDown, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { useClub } from "@/lib/club-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/sessions", label: "Sessions", icon: Calendar },
  { to: "/equipment", label: "Gear", icon: Wrench },
  { to: "/members", label: "Members", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ title, action, children }: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { activeClub, memberships, setActiveClubId } = useClub();
  const location = useLocation();
  const approved = memberships.filter((m) => m.status === "approved");

  return (
    <div className="min-h-screen bg-background">
      <header className="safe-top sticky top-0 z-20 bg-primary text-primary-foreground shadow-md">
        <div className="px-4 pt-3 pb-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Waves className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            {activeClub && approved.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-left max-w-full">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider opacity-70">Club</div>
                    <div className="font-semibold truncate flex items-center gap-1">
                      {activeClub.club.name}
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Switch club</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {approved.map((m) => (
                    <DropdownMenuItem key={m.club_id} onSelect={() => setActiveClubId(m.club_id)}>
                      {m.club.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">Club</div>
                <div className="font-semibold truncate">{activeClub?.club.name ?? "IRB Coaching"}</div>
              </div>
            )}
          </div>
          {action}
        </div>
        {title && (
          <div className="px-4 pb-3">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          </div>
        )}
      </header>

      <main className="pb-24 px-4 pt-4 max-w-2xl mx-auto">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.3]" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

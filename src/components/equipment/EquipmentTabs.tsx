import { Link, useLocation } from "@tanstack/react-router";

const tabs = [
  { to: "/equipment", label: "Gear", exact: true },
  { to: "/equipment/lists", label: "Lists", exact: false },
  { to: "/equipment/faults", label: "Faults", exact: false },
] as const;

export function EquipmentTabs() {
  const location = useLocation();
  return (
    <div className="-mt-1 mb-4 grid grid-cols-3 rounded-xl bg-muted p-1 text-sm font-medium">
      {tabs.map((t) => {
        const active = t.exact
          ? location.pathname === t.to
          : location.pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`text-center py-2 rounded-lg transition-colors ${
              active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

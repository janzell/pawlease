import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BookOpen, CalendarDays, Dog, Home, ListChecks, Menu, Stethoscope, Users } from "lucide-react";
import { useSession } from "../state.tsx";

const PRIMARY = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/pets", label: "Pets", icon: Dog },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/bookings", label: "Bookings", icon: CalendarDays },
];

const SECONDARY: { to: string; label: string; icon: typeof Home; end?: boolean }[] = [
  { to: "/pros", label: "Professionals", icon: Stethoscope },
  { to: "/guides", label: "Guides", icon: BookOpen },
  { to: "/family", label: "Family", icon: Users },
];

export function Layout() {
  const { me, toastMsg } = useSession();
  const { pathname } = useLocation();
  const inMore = SECONDARY.some((s) => pathname.startsWith(s.to));
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <img src="/icon.svg" alt="" />
          Pawlease
        </div>
        <NavLink to="/family" className="household-pill">
          <Users size={16} />
          <span className="ellipsis">{me.household.name}</span>
        </NavLink>
        {[...PRIMARY, ...SECONDARY].map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} />
            {label === "Tasks" ? "Tasks & Notes" : label}
          </NavLink>
        ))}
      </nav>

      <main className="main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {PRIMARY.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
        <NavLink to="/more" className={({ isActive }) => (isActive || inMore ? "active" : "")}>
          <Menu size={22} />
          More
        </NavLink>
      </nav>

      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

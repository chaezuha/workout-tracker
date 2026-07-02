import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { to: "/", label: "Workout" },
  { to: "/checkin", label: "Check-in" },
  { to: "/stats", label: "Stats" },
  { to: "/calculators", label: "Calculators" },
];

export const NavBar = () => {
  const { user, isGuest, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-y-2 px-6 py-3">
        <nav className="flex gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {isGuest ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Guest
              </span>
              <Button asChild size="sm">
                <Link to="/auth?mode=signup">Sign up</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/auth?mode=signin">Sign in</Link>
              </Button>
            </>
          ) : (
            <>
              <span className="hidden max-w-[16ch] truncate text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={signOut}
              >
                Sign out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

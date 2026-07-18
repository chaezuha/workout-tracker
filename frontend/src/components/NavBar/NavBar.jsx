import { Link, NavLink } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useTheme } from "@/hooks/useTheme";

const links = [
  { to: "/", label: "Workout" },
  { to: "/checkin", label: "Check-in" },
  { to: "/stats", label: "Stats" },
  { to: "/calculators", label: "Calculators" },
];

// Only rendered when something needs attention; when online and synced the
// nav stays clean.
const SyncBadge = ({ pending, online }) => {
  if (online && pending === 0) return null;
  const label = !online
    ? pending > 0
      ? `Offline — ${pending} pending`
      : "Offline"
    : `${pending} pending`;
  return (
    <Badge variant="outline" className="whitespace-nowrap">
      {label}
    </Badge>
  );
};

export const NavBar = () => {
  const { user, isGuest, signOut } = useAuth();
  const { pending, online } = useSyncStatus();
  const { resolvedTheme, toggle } = useTheme();

  const signOutButton = (
    <Button type="button" variant="outline" size="sm" onClick={pending > 0 ? undefined : signOut}>
      Sign out
    </Button>
  );

  return (
    // Stickiness lives on the AppLayout chrome container so the timer bar
    // can stack beneath the nav.
    <header className="border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-y-2 px-6 py-3">
        <nav className="flex gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 pointer-coarse:py-2.5 text-sm font-medium transition-colors ${
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={
              resolvedTheme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
          </Button>
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
              <SyncBadge pending={pending} online={online} />
              <span className="hidden max-w-[16ch] truncate text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              {pending > 0 ? (
                <ConfirmDialog
                  trigger={signOutButton}
                  title="Sign out with unsynced changes?"
                  description={`${pending} ${
                    pending === 1 ? "change hasn't" : "changes haven't"
                  } reached your account yet. They only sync if this device reconnects — signing out now risks losing them.`}
                  confirmLabel="Sign out"
                  confirmVariant="destructive"
                  onConfirm={signOut}
                />
              ) : (
                signOutButton
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

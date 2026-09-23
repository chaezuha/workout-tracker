import { useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { DropdownMenu } from "radix-ui";
import { Menu, Check, Dumbbell, CalendarDays, ChartNoAxesCombined, Calculator, LogOut, LogIn, UserPlus } from "lucide-react";
import { OverflowMenu } from "@/components/ui/overflow-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { HeaderSlotTarget } from "@/components/HeaderBar/HeaderSlot";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useTheme } from "@/hooks/useTheme";

const links = [
  { to: "/", label: "Workout", icon: Dumbbell },
  { to: "/checkin", label: "Check-In", icon: CalendarDays },
  { to: "/stats", label: "Stats", icon: ChartNoAxesCombined },
  { to: "/calculators", label: "Calculators", icon: Calculator },
];

// Swatches for the GNOME style switcher (System / Light / Dark).
const styles = [
  { value: "system", label: "Follow system style", swatch: "bg-[linear-gradient(135deg,#ffffff_50%,#222226_50%)]" },
  { value: "light", label: "Light style", swatch: "bg-white" },
  { value: "dark", label: "Dark style", swatch: "bg-[#222226]" },
];

const StyleSwitcher = ({ theme, setTheme }) => (
  <DropdownMenu.RadioGroup value={theme} onValueChange={setTheme} className="flex justify-center gap-4 px-3 pt-1 pb-2.5">
    {styles.map(({ value, label, swatch }) => (
      <DropdownMenu.RadioItem
        key={value}
        value={value}
        aria-label={label}
        title={label}
        // Keep the menu open so the change is visible in place.
        onSelect={(e) => e.preventDefault()}
        className={`relative grid size-11 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_6/20%)] outline-none data-[state=checked]:shadow-[0_0_0_2px_var(--primary)] focus-visible:shadow-[0_0_0_2px_var(--ring)] ${swatch}`}
      >
        <DropdownMenu.ItemIndicator className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </DropdownMenu.ItemIndicator>
      </DropdownMenu.RadioItem>
    ))}
  </DropdownMenu.RadioGroup>
);

// AdwHeaderBar: page actions at the start, the view switcher (desktop) or the
// window title (phones) in the middle, the main menu at the end. On phones the
// switcher moves to a bottom bar, as AdwViewSwitcherBar does.
export const NavBar = () => {
  const { user, isGuest, signOut } = useAuth();
  const { pending, online } = useSyncStatus();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const accountRef = useRef(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const syncLabel = !online ? (pending ? `Offline · ${pending} pending` : "Offline") : pending ? `${pending} pending` : null;
  const title = links.find(({ to }) => to === pathname)?.label ?? "Workout Tracker";
  const actions = isGuest ? [
    { label: "Sign Up", icon: UserPlus, onSelect: () => navigate("/auth?mode=signup") },
    { label: "Sign In", icon: LogIn, onSelect: () => navigate("/auth?mode=signin") },
  ] : [
    { label: "Sign Out", icon: LogOut, onSelect: () => pending > 0 ? setConfirmSignOut(true) : signOut() },
  ];

  return (
    <>
      <header className="bg-headerbar pt-[env(safe-area-inset-top)] shadow-[0_1px_0_var(--separator)]">
        <div className="mx-auto grid h-[var(--headerbar-height)] max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-1.5 sm:px-2">
          <HeaderSlotTarget className="flex min-w-0 items-center gap-1.5 justify-self-start" />
          <div className="min-w-0 text-center sm:hidden">
            <p className="truncate text-[0.9375rem] leading-tight font-bold">{title}</p>
            {syncLabel && <p className="truncate text-xs leading-tight text-muted-foreground" role="status">{syncLabel}</p>}
          </div>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"}
                className={({ isActive }) => `flex h-[34px] items-center gap-2 rounded-md px-3.5 text-sm font-bold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring ${isActive ? "bg-fill-hover" : "hover:bg-fill"}`}>
                <Icon className="size-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex min-w-0 items-center gap-2 justify-self-end">
            {syncLabel && <span className="hidden truncate text-xs text-muted-foreground sm:inline" role="status">{syncLabel}</span>}
            <OverflowMenu label="Main menu" heading={isGuest ? "Guest (this browser only)" : user.email} icon={Menu} triggerRef={accountRef} actions={["separator", ...actions]}>
              <StyleSwitcher theme={theme} setTheme={setTheme} />
            </OverflowMenu>
          </div>
        </div>
      </header>
      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 gap-1 bg-headerbar px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--separator)] sm:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => `flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-md text-xs font-bold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring ${isActive ? "bg-fill-hover" : "text-muted-foreground active:bg-fill"}`}>
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <ConfirmDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} restoreFocusRef={accountRef}
        title="Sign Out With Unsynced Changes?"
        description={`${pending} ${pending === 1 ? "change hasn't" : "changes haven't"} reached your account yet. They only sync if this device reconnects, so signing out now risks losing them.`}
        confirmLabel="Sign Out" confirmVariant="destructive" onConfirm={signOut} />
    </>
  );
};

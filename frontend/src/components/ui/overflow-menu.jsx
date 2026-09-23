import { useRef } from "react";
import { DropdownMenu } from "radix-ui";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./button";

// Actions run after the menu restores focus. Dialogs stay mounted outside the
// menu portal, so opening one never loses its content when the menu closes.
// "separator" entries in `actions` draw a divider; `children` render between
// the heading and the actions (e.g. the main menu's style switcher).
export function OverflowMenu({ label, actions, triggerRef, icon: Icon = MoreHorizontal, heading, children, variant = "ghost", size = "icon" }) {
  const pendingAction = useRef(null);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button ref={triggerRef} variant={variant} size={size} aria-label={label}>
          <Icon aria-hidden />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 min-w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-popover p-1.5 text-popover-foreground shadow-[var(--popover-shadow)] duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          onCloseAutoFocus={() => {
            const action = pendingAction.current;
            pendingAction.current = null;
            if (action) requestAnimationFrame(action);
          }}
        >
          {heading && <DropdownMenu.Label className="max-w-64 truncate px-3 pt-2 pb-1.5 text-xs text-muted-foreground">{heading}</DropdownMenu.Label>}
          {children}
          {actions.filter(Boolean).map((action, i) => {
            if (action === "separator") {
              return <DropdownMenu.Separator key={`sep-${i}`} className="-mx-1.5 my-1.5 h-px bg-separator" />;
            }
            const { label: itemLabel, onSelect, disabled, destructive, icon: ItemIcon } = action;
            return (
              <DropdownMenu.Item
                key={itemLabel}
                data-slot="menu-item"
                disabled={disabled}
                onSelect={() => { pendingAction.current = onSelect; }}
                className={`flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-fill data-disabled:opacity-50 ${destructive ? "text-destructive" : ""}`}
              >
                {ItemIcon && <ItemIcon className="size-4" aria-hidden />}
                {itemLabel}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

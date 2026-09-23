import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "@/components/ui/icons";

function Dialog({
  ...props
}) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/30 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props} />
  );
}

// AdwDialog: a bottom sheet on phones, a floating dialog from sm up.
// variant="alert" (AdwAlertDialog) floats centered at every size.
const contentVariants = {
  sheet:
    "inset-x-0 bottom-0 max-h-[calc(100dvh-1.5rem)] w-full rounded-t-2xl px-5 pt-7 pb-[calc(1.25rem+env(safe-area-inset-bottom))] duration-300 ease-out data-open:slide-in-from-bottom data-closed:slide-out-to-bottom data-closed:duration-200 sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-4rem)] sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5 sm:duration-200 sm:data-open:[--tw-enter-translate-y:0.5rem] sm:data-closed:[--tw-exit-translate-y:0.5rem] sm:data-open:zoom-in-[0.97] sm:data-closed:zoom-out-[0.97]",
  alert:
    "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 duration-200 data-open:zoom-in-95 data-closed:zoom-out-95",
}

// headerbar: the content starts with a <DialogHeaderBar> (AdwDialog's
// header bar), so the top padding and the floating close button go away.
function DialogContent({
  className,
  children,
  showCloseButton = true,
  variant = "sheet",
  headerbar = false,
  ...props
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-variant={variant}
        className={cn(
          "group/dialog fixed z-50 grid grid-cols-[minmax(0,1fr)] [&>*]:min-w-0 gap-4 overflow-y-auto overscroll-contain bg-dialog text-popover-foreground shadow-[var(--dialog-shadow)] outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          contentVariants[variant],
          headerbar && "pt-3 sm:pt-0",
          className
        )}
        {...props}>
        {variant === "sheet" && (
          <div aria-hidden className="absolute top-2 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-fill-active sm:hidden" />
        )}
        {children}
        {showCloseButton && variant === "sheet" && !headerbar && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" shape="circular" className="absolute top-3.5 right-3 sm:top-3" size="icon-sm">
              <X />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

// AdwDialog's header bar: flat buttons at either end (e.g. Cancel and a
// suggested Save), the title centered between them. It sticks to the top
// while the dialog body scrolls, and bleeds to the content's edges.
function DialogHeaderBar({
  start,
  end,
  title,
  subtitle,
  className,
}) {
  return (
    <div
      data-slot="dialog-headerbar"
      className={cn("sticky top-0 z-10 -mx-5 grid min-h-[47px] grid-cols-[1fr_auto_1fr] items-center gap-2 bg-dialog px-1.5 sm:px-2", className)}>
      <div className="flex min-w-0 items-center gap-1.5 justify-self-start">{start}</div>
      <div className="min-w-0 text-center">
        <DialogTitle className="truncate text-[0.9375rem] leading-tight">{title}</DialogTitle>
        {subtitle && <p className="truncate text-xs leading-tight text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex min-w-0 items-center gap-1.5 justify-self-end">{end}</div>
    </div>
  );
}

// A header-bar end button that closes the dialog (view-only dialogs).
function DialogHeaderClose() {
  return (
    <DialogPrimitive.Close data-slot="dialog-close" asChild>
      <Button variant="ghost" shape="circular" size="icon">
        <X />
        <span className="sr-only">Close</span>
      </Button>
    </DialogPrimitive.Close>
  );
}

// Centered like an AdwHeaderBar title, with the description as its subtitle.
function DialogHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col items-center gap-1 px-8 text-center group-data-[variant=alert]/dialog:gap-2.5 group-data-[variant=alert]/dialog:px-0", className)}
      {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end group-data-[variant=alert]/dialog:grid group-data-[variant=alert]/dialog:auto-cols-fr group-data-[variant=alert]/dialog:grid-flow-col group-data-[variant=alert]/dialog:gap-3 group-data-[variant=alert]/dialog:pt-2 group-data-[variant=alert]/dialog:*:h-11 group-data-[variant=alert]/dialog:*:rounded-full",
        className
      )}
      {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("break-words font-heading text-[1.0625rem] leading-snug font-bold group-data-[variant=alert]/dialog:text-[1.375rem] group-data-[variant=alert]/dialog:font-extrabold", className)}
      {...props} />
  );
}

function DialogDescription({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground group-data-[variant=alert]/dialog:text-[0.9375rem] group-data-[variant=alert]/dialog:text-popover-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props} />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogHeaderBar,
  DialogHeaderClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

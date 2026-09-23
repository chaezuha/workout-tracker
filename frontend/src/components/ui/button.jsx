import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Adwaita button styles. Variant names are the shadcn ones the app already
// uses; what they map to: default = suggested-action, outline/secondary =
// the regular gray button, ghost = flat, destructive = destructive-action.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border-0 text-sm font-bold whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:outline-2 aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary),white_10%)] active:bg-[color-mix(in_srgb,var(--primary),black_10%)]",
        toggle: "bg-fill hover:bg-fill-hover active:bg-fill-active aria-pressed:bg-primary aria-pressed:text-primary-foreground",
        outline: "bg-fill hover:bg-fill-hover active:bg-fill-active aria-expanded:bg-fill-active",
        secondary: "bg-fill hover:bg-fill-hover active:bg-fill-active aria-expanded:bg-fill-active",
        ghost: "bg-transparent hover:bg-fill active:bg-fill-hover aria-expanded:bg-fill-hover",
        destructive: "bg-destructive-bg text-white hover:bg-[color-mix(in_srgb,var(--destructive-bg),white_10%)] active:bg-[color-mix(in_srgb,var(--destructive-bg),black_10%)]",
        link: "text-accent-text underline-offset-4 hover:underline",
      },
      // pointer-coarse: (@media (pointer: coarse)) bumps every size on touch
      // devices toward the ~44px tap-target guidance without touching desktop.
      size: {
        default:
          "h-[34px] pointer-coarse:h-11 gap-2 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 pointer-coarse:h-8 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[30px] pointer-coarse:h-9 gap-1.5 px-2.5 text-[0.8125rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 pointer-coarse:h-11 gap-2 px-4",
        pill: "h-11 gap-2 rounded-full px-8",
        icon: "size-[34px] pointer-coarse:size-11",
        "icon-xs": "size-6 pointer-coarse:size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[30px] pointer-coarse:size-9",
        "icon-lg": "size-10 pointer-coarse:size-11",
      },
      // Adwaita's .circular style class.
      shape: {
        default: "",
        circular: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  shape,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }

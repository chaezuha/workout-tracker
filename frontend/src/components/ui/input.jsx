import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[34px] pointer-coarse:h-11 w-full min-w-0 rounded-md border-0 bg-fill px-2.5 py-1 text-base transition-[background-color,outline-color] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:bg-fill-hover focus-visible:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:outline-2 aria-invalid:-outline-offset-2 aria-invalid:outline-destructive md:text-[0.9375rem]",
        className
      )}
      {...props} />
  );
}

export { Input }

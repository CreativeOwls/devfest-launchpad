import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "gt-sheen inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-[color-mix(in_oklab,var(--primary)_86%,var(--brand-ink))] text-primary-foreground border border-primary/70 shadow-[inset_0_1px_0_oklch(1_0_0/0.22),0_1px_2px_oklch(0.2_0.02_264/0.18),0_6px_16px_-8px_oklch(0.2_0.02_264/0.55)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.28),0_2px_4px_oklch(0.2_0.02_264/0.18),0_12px_26px_-10px_oklch(0.2_0.02_264/0.6)] active:translate-y-[1px] active:shadow-[inset_0_2px_4px_oklch(0.15_0.02_264/0.35)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:-translate-y-px active:translate-y-[1px]",
        outline:
          "border border-input bg-background shadow-[inset_0_1px_0_oklch(1_0_0/0.7),0_1px_2px_oklch(0.2_0.02_264/0.06)] hover:-translate-y-px hover:bg-accent hover:text-accent-foreground hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.8),0_6px_16px_-10px_oklch(0.2_0.02_264/0.45)] active:translate-y-[1px] active:shadow-[inset_0_2px_3px_oklch(0.2_0.02_264/0.12)]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/70 shadow-[inset_0_1px_0_oklch(1_0_0/0.6)] hover:bg-secondary/80 hover:-translate-y-px active:translate-y-[1px]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:-translate-y-px active:translate-y-[1px]",
        link: "text-primary underline-offset-4 hover:underline",
        google:
          "rounded-full bg-surface-invert text-surface-invert-foreground shadow-lg shadow-black/40 font-medium transition-transform duration-200 hover:scale-105 hover:bg-surface-invert active:scale-100 [&_svg]:size-5",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        pill: "h-12 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

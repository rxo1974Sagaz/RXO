import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:opacity-90",
        ghost: "bg-transparent text-fg hover:bg-paper",
        outline: "bg-bg text-fg shadow-[var(--shadow-border)] hover:bg-paper",
      },
      size: {
        default: "h-11 rounded-md px-5 text-sm",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "size-11 rounded-full",
        sm: "h-9 rounded-sm px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

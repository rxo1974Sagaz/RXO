import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full resize-none bg-transparent text-fg placeholder:text-faint",
        "focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

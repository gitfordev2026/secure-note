"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  className?: string;
}

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = false, ...props }, ref) => (
    <hr
      ref={ref}
      role={decorative ? undefined : "separator"}
      aria-orientation={orientation}
      className={cn(
        "border-input border shrink-0 [&:not(separator)]:rounded-full",
        orientation === "horizontal" ? "h-[1px] w-full" : "w-[1px] h-full",
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";

export { Separator };

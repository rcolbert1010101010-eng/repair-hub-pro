import * as React from "react";
import { cn } from "@/lib/utils";
import type { BadgeProps } from "./badge.utils";
import { badgeVariants } from "./badge.utils";

const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};

export { Badge };

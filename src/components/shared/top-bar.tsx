"use client";

import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/timesheet": "Timesheet",
  "/figma-versions": "Figma Versions",
  "/figma-urls": "Figma URLs",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Projects Timesheet";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-white border-b border-border">
      <h1 className="text-lg font-semibold tracking-tight text-primary">{title}</h1>
      <div className="flex items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
            PT
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

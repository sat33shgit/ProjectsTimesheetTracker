"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Palette,
  Link2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timesheet", label: "Timesheet", icon: Clock },
  { href: "/figma-versions", label: "Versions", icon: Palette },
  { href: "/figma-urls", label: "URLs", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border flex justify-around py-2 px-1"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
              isActive ? "text-accent" : "text-muted-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className="size-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

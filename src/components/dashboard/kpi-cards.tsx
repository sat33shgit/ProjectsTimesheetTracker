"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, DollarSign, IndianRupee, FolderOpen, TrendingUp } from "lucide-react";

interface KPICardsProps {
  totalHours: number;
  totalCAD: number;
  totalINR: number;
  activeProjects: number;
}

export function KPICards({ totalHours, totalCAD, totalINR, activeProjects }: KPICardsProps) {
  const cards = [
    {
      label: "Total Hours",
      value: totalHours.toFixed(2) + " hrs",
      icon: Clock,
      color: "text-accent",
    },
    {
      label: "Total Earnings (CAD)",
      value: new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(totalCAD),
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      label: "Total Earnings (INR)",
      value: "₹" + new Intl.NumberFormat("en-IN").format(Math.round(totalINR)),
      icon: IndianRupee,
      color: "text-amber-600",
    },
    {
      label: "Active Projects",
      value: String(activeProjects),
      icon: FolderOpen,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="rounded-xl border border-zinc-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold font-mono mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} opacity-80`}>
                <card.icon className="size-8" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <TrendingUp className="size-3" />
              <span>All time</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

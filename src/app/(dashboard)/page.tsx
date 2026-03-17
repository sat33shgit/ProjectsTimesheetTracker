"use client";

import { useState, useEffect, useCallback } from "react";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { RateConfig } from "@/components/dashboard/rate-config";
import { ProjectEarningsTable } from "@/components/dashboard/project-earnings-table";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  kpis: {
    totalHours: number;
    totalCAD: number;
    totalINR: number;
    activeProjects: number;
  };
  hourlyRate: number;
  conversionRate: number;
  projects: {
    projectId: number;
    projectName: string;
    totalHours: number;
    earningsCAD: number;
    earningsINR: number;
  }[];
  topProjects: {
    projectName: string;
    totalHours: number;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px] rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <p className="text-lg font-medium">No data available</p>
        <p className="text-sm mt-1">Add projects and log time to see your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KPICards
        totalHours={data.kpis.totalHours}
        totalCAD={data.kpis.totalCAD}
        totalINR={data.kpis.totalINR}
        activeProjects={data.kpis.activeProjects}
      />

      <RateConfig
        initialRate={data.hourlyRate}
        onRateChange={() => fetchData()}
      />

      {data.topProjects.length > 0 && (
        <DashboardCharts topProjects={data.topProjects} />
      )}

      <ProjectEarningsTable
        projects={data.projects}
        totalHours={data.kpis.totalHours}
        totalCAD={data.kpis.totalCAD}
        totalINR={data.kpis.totalINR}
      />
    </div>
  );
}

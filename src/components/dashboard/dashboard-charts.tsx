"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#6366F1", "#1E293B", "#10B981", "#F59E0B",
  "#F43F5E", "#8B5CF6", "#06B6D4", "#EC4899",
];

interface ProjectChartData {
  projectName: string;
  totalHours: number;
}

interface DashboardChartsProps {
  topProjects: ProjectChartData[];
}

export function DashboardCharts({ topProjects }: DashboardChartsProps) {
  const barData = topProjects.map((p) => ({
    name: p.projectName.length > 20 ? p.projectName.slice(0, 20) + "…" : p.projectName,
    hours: p.totalHours,
  }));

  const pieData = topProjects.map((p) => ({
    name: p.projectName.length > 15 ? p.projectName.slice(0, 15) + "…" : p.projectName,
    value: p.totalHours,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="rounded-xl border border-zinc-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top Projects by Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)} hrs`, "Hours"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #E4E4E7" }}
                />
                <Bar dataKey="hours" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-zinc-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Hours Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                  fontSize={10}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)} hrs`, "Hours"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #E4E4E7" }}
                />
                <Legend fontSize={11} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const schema = z.object({
  projectId: z.string().min(1, "Project is required"),
  date: z.string().min(1, "Date is required"),
  hours: z.number().min(0.25, "Min 0.25 hrs").max(24, "Max 24 hrs"),
  details: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Project {
  id: number;
  name: string;
}

interface TimesheetEntry {
  id: number;
  projectId: number;
  projectName: string;
  date: string;
  hours: string;
  details: string | null;
}

interface LogTimeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimesheetEntry | null;
  projects: Project[];
  onSaved: () => void;
}

const QUICK_HOURS = [0.25, 0.5, 1, 2, 4, 8];

export function LogTimeDrawer({
  open,
  onOpenChange,
  entry,
  projects,
  onSaved,
}: LogTimeDrawerProps) {
  const isEditing = !!entry;
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: "",
      date: new Date().toISOString().split("T")[0],
      hours: 1,
      details: "",
    },
  });

  const currentHours = watch("hours");

  useEffect(() => {
    if (entry) {
      reset({
        projectId: String(entry.projectId),
        date: typeof entry.date === "string"
          ? entry.date.split("T")[0]
          : new Date(entry.date).toISOString().split("T")[0],
        hours: Number(entry.hours),
        details: entry.details || "",
      });
    } else {
      reset({
        projectId: "",
        date: new Date().toISOString().split("T")[0],
        hours: 1,
        details: "",
      });
    }
  }, [entry, reset, open]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const url = isEditing ? `/api/timesheet/${entry.id}` : "/api/timesheet";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(isEditing ? "Entry updated" : "Time logged successfully");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto px-6 sm:px-8">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Entry" : "Log Time"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="projectId">Project *</Label>
            <select
              id="projectId"
              {...register("projectId")}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="text-xs text-destructive">{errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Hours *</Label>
            <Input
              id="hours"
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              {...register("hours", { valueAsNumber: true })}
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_HOURS.map((h) => (
                <Badge
                  key={h}
                  variant={currentHours === h ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setValue("hours", h)}
                >
                  {h}
                </Badge>
              ))}
            </div>
            {errors.hours && (
              <p className="text-xs text-destructive">{errors.hours.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              {...register("details")}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving..." : isEditing ? "Update Entry" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

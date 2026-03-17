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
import { toast } from "sonner";

const schema = z.object({
  application: z.string().min(1, "Application is required"),
  version: z.number().int().positive("Version must be a positive integer"),
  details: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface FigmaVersion {
  id: number;
  application: string;
  version: number;
  details: string | null;
}

interface FigmaVersionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: FigmaVersion | null;
  applications: string[];
  onSaved: () => void;
}

export function FigmaVersionDrawer({
  open,
  onOpenChange,
  entry,
  applications,
  onSaved,
}: FigmaVersionDrawerProps) {
  const isEditing = !!entry;
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (entry) {
      reset({
        application: entry.application,
        version: entry.version,
        details: entry.details || "",
      });
    } else {
      reset({
        application: "",
        version: undefined as unknown as number,
        details: "",
      });
    }
  }, [entry, reset, open]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const url = isEditing ? `/api/figma-versions/${entry.id}` : "/api/figma-versions";
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

      toast.success(isEditing ? "Version updated" : "Version added");
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
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Version" : "Add Version"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6 px-1">
          <div className="space-y-2">
            <Label htmlFor="application">Application *</Label>
            <Input
              id="application"
              {...register("application")}
              list="app-list"
              placeholder="Type to search or create new..."
            />
            <datalist id="app-list">
              {applications.map((app) => (
                <option key={app} value={app} />
              ))}
            </datalist>
            {errors.application && (
              <p className="text-xs text-destructive">{errors.application.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Version Number *</Label>
            <Input
              id="version"
              type="number"
              {...register("version", { valueAsNumber: true })}
              min="1"
              step="1"
            />
            {errors.version && (
              <p className="text-xs text-destructive">{errors.version.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              {...register("details")}
              placeholder="Describe what changed in this version..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving..." : isEditing ? "Update" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

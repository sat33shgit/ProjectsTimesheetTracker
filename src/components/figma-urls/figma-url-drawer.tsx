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
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  application: z.string().min(1, "Application is required"),
  url: z.string().url("Please enter a valid URL").refine(
    (v) => /^https?:\/\/(www\.)?figma\.com\/.+/i.test(v),
    "Must be a valid Figma URL (https://figma.com/...)"
  ),
  details: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface FigmaUrl {
  id: number;
  application: string;
  url: string;
  details: string | null;
}

interface FigmaUrlDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: FigmaUrl | null;
  applications: string[];
  onSaved: () => void;
}

export function FigmaUrlDrawer({
  open,
  onOpenChange,
  entry,
  applications,
  onSaved,
}: FigmaUrlDrawerProps) {
  const isEditing = !!entry;
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const currentUrl = watch("url");

  useEffect(() => {
    if (entry) {
      reset({
        application: entry.application,
        url: entry.url,
        details: entry.details || "",
      });
    } else {
      reset({
        application: "",
        url: "",
        details: "",
      });
    }
  }, [entry, reset, open]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const url = isEditing ? `/api/figma-urls/${entry.id}` : "/api/figma-urls";
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

      toast.success(isEditing ? "URL updated" : "URL added");
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
          <SheetTitle>{isEditing ? "Edit URL" : "Add URL"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="application">Application *</Label>
            <Input
              id="application"
              {...register("application")}
              list="url-app-list"
              placeholder="Type to search or create new..."
            />
            <datalist id="url-app-list">
              {applications.map((app) => (
                <option key={app} value={app} />
              ))}
            </datalist>
            {errors.application && (
              <p className="text-xs text-destructive">{errors.application.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Figma URL *</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                {...register("url")}
                placeholder="https://figma.com/..."
                className="flex-1"
              />
              {currentUrl && /^https?:\/\/.+/.test(currentUrl) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(currentUrl, "_blank", "noopener,noreferrer")}
                  aria-label="Test link"
                >
                  <ExternalLink className="size-4" />
                </Button>
              )}
            </div>
            {errors.url && (
              <p className="text-xs text-destructive">{errors.url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              {...register("details")}
              placeholder="Additional notes..."
              rows={3}
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

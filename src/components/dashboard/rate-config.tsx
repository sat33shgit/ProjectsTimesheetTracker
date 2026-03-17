"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RateConfigProps {
  initialRate: number;
  onRateChange: (rate: number) => void;
}

export function RateConfig({ initialRate, onRateChange }: RateConfigProps) {
  const [rate, setRate] = useState(String(initialRate));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setRate(String(initialRate));
  }, [initialRate]);

  const saveRate = useCallback(async () => {
    const numRate = Number(rate);
    if (isNaN(numRate) || numRate <= 0) {
      toast.error("Please enter a valid hourly rate");
      setRate(String(initialRate));
      return;
    }

    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hourly_rate_cad: String(numRate) }),
      });
      onRateChange(numRate);
      setEditing(false);
      toast.success("Hourly rate updated");
    } catch {
      toast.error("Failed to update rate");
    }
  }, [rate, initialRate, onRateChange]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Label className="text-sm font-medium text-muted-foreground">Hourly Rate (CAD):</Label>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-24 h-8 text-sm font-mono"
            step="0.5"
            min="0"
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRate();
              if (e.key === "Escape") {
                setRate(String(initialRate));
                setEditing(false);
              }
            }}
            onBlur={saveRate}
            autoFocus
          />
          <Button variant="ghost" size="sm" onClick={saveRate} aria-label="Save rate">
            <Check className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-sm font-mono font-semibold hover:text-accent transition-colors"
          aria-label="Edit hourly rate"
        >
          ${initialRate}/hr
          <Pencil className="size-3 text-muted-foreground" />
        </button>
      )}
      <span className="text-xs text-muted-foreground">INR = CAD × 60</span>
    </div>
  );
}

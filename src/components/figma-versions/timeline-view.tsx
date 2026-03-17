"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FigmaVersion {
  id: number;
  application: string;
  version: number;
  details: string | null;
}

interface TimelineViewProps {
  versions: FigmaVersion[];
}

export function TimelineView({ versions }: TimelineViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Group by application
  const grouped = versions.reduce<Record<string, FigmaVersion[]>>((acc, v) => {
    if (!acc[v.application]) acc[v.application] = [];
    acc[v.application].push(v);
    return acc;
  }, {});

  const toggleApp = (app: string) => {
    setExpanded((prev) => ({ ...prev, [app]: !prev[app] }));
  };

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([app, vers]) => {
        const isOpen = expanded[app] !== false; // default open
        return (
          <div key={app} className="border border-zinc-100 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleApp(app)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50/50 hover:bg-zinc-100/50 transition-colors text-left"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <span className="font-semibold text-sm">{app}</span>
                <Badge variant="secondary" className="text-xs">{vers.length} versions</Badge>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 py-3">
                <div className="relative border-l-2 border-accent/20 ml-3 space-y-4">
                  {vers.map((v) => (
                    <div key={v.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 size-4 rounded-full bg-accent border-2 border-white" />
                      <Card className="rounded-lg shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              v{v.version}
                            </Badge>
                          </div>
                          {v.details ? (
                            <ExpandableText text={v.details} maxLength={120} />
                          ) : (
                            <p className="text-xs text-muted-foreground">No details</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExpandableText({ text, maxLength }: { text: string; maxLength: number }) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= maxLength) {
    return <p className="text-sm text-muted-foreground">{text}</p>;
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {expanded ? text : text.slice(0, maxLength) + "..."}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs px-0 h-auto text-accent"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Show less" : "Read more"}
      </Button>
    </div>
  );
}

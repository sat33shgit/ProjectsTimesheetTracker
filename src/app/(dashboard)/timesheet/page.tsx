import { Suspense } from "react";
import TimesheetContent from "./timesheet-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function TimesheetPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      }
    >
      <TimesheetContent />
    </Suspense>
  );
}

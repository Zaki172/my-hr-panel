import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Activity } from "lucide-react";

export function RecentActivityCard() {
  const { selectedCompanyId } = useCompanyFilter();
  const activity = useQuery(api.dashboard.getRecentActivity, { companyId: selectedCompanyId });
  return (
    <Card>
      <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activity === undefined ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />) : activity.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No activity yet</p>
        ) : (
          activity.map((entry) => (
            <div key={entry._id} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Activity className="size-3.5" /></div>
              <div>
                <p className="text-sm leading-snug">{entry.description}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(entry._creationTime, { addSuffix: true })}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

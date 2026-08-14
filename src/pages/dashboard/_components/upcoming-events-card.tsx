import { useQuery } from "convex/react";
import { format } from "date-fns";
import { CalendarDays, Cake, PartyPopper, Flag } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { cn } from "@/lib/utils.ts";

const EVENT_STYLES = { holiday: { icon: PartyPopper, iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }, deadline: { icon: Flag, iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }, birthday: { icon: Cake, iconClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400" } } as const;
function relativeLabel(daysAway: number): string { if (daysAway === 0) return "Today"; if (daysAway === 1) return "Tomorrow"; return `In ${daysAway} days`; }

export function UpcomingEventsCard() {
  const { selectedCompanyId } = useCompanyFilter();
  const events = useQuery(api.dashboard.getUpcomingEvents, { companyId: selectedCompanyId });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" />Upcoming Events</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-1">
        {events === undefined ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No upcoming events in the next 45 days</p>
        ) : (
          events.map((event) => {
            const style = EVENT_STYLES[event.type];
            const Icon = style.icon;
            return (
              <div key={event.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60">
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", style.iconClass)}><Icon className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{event.subtitle} \u00b7 {format(new Date(event.date + "T00:00:00"), "MMM d")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{relativeLabel(event.daysAway)}</span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

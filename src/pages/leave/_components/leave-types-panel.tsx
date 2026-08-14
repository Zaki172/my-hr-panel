import { CalendarHeart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { LEAVE_TYPES, LEAVE_TYPE_LABELS, LEAVE_TYPE_DOT, LEAVE_TYPE_DESCRIPTIONS } from "../_lib/leave-constants.ts";
import { cn } from "@/lib/utils.ts";

export function LeaveTypesPanel() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CalendarHeart className="size-4 text-primary" />Leave Types</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {LEAVE_TYPES.map((type) => (<div key={type} className="flex items-start gap-3"><span className={cn("mt-1 size-3 shrink-0 rounded-full", LEAVE_TYPE_DOT[type])} /><div className="min-w-0"><p className="text-sm font-medium">{LEAVE_TYPE_LABELS[type]}</p><p className="text-xs text-muted-foreground">{LEAVE_TYPE_DESCRIPTIONS[type]}</p></div></div>))}
      </CardContent>
    </Card>
  );
}

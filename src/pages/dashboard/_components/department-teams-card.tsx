import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";

type LocalFilter = "all" | Id<"companies">;

export function DepartmentTeamsCard() {
  const { companies } = useCompanyFilter();
  const [local, setLocal] = useState<LocalFilter>("all");
  const localCompanyId = local === "all" ? undefined : local;
  const teams = useQuery(api.dashboard.getDepartmentTeams, { companyId: localCompanyId });
  const toggleOptions = useMemo(() => {
    const opts: { label: string; value: LocalFilter }[] = [{ label: "All", value: "all" }];
    for (const c of companies ?? []) opts.push({ label: c.name.split(" ")[0], value: c._id });
    return opts;
  }, [companies]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Department-wise Team</CardTitle>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {toggleOptions.map((opt) => (
            <Button key={opt.value} size="sm" variant={local === opt.value ? "default" : "ghost"} onClick={() => setLocal(opt.value)} className={cn("h-7 px-3 text-xs", local !== opt.value && "text-muted-foreground hover:text-foreground")}>{opt.label}</Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {teams === undefined ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />) : teams.filter((t) => t.memberCount > 0).length === 0 ? (
          <p className="col-span-full py-4 text-center text-sm text-muted-foreground">No departments yet</p>
        ) : (
          teams.filter((t) => t.memberCount > 0).slice(0, 8).map(({ department, memberCount }) => (
            <button key={department._id} onClick={() => toast.info("Coming soon in a future milestone!")} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent/60">
              <div>
                <p className="text-sm font-medium">{department.name}</p>
                <p className="text-xs text-muted-foreground">{memberCount} member{memberCount === 1 ? "" : "s"}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

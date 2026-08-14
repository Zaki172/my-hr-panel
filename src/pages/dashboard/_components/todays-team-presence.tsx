import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { AttendanceStatusBadge } from "@/components/status-badges.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Users } from "lucide-react";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";

const WORK_MODE_LABEL: Record<string, string> = { office: "Office", remote: "Remote", hybrid: "Hybrid" };
function formatTime(iso: string | undefined) { if (!iso) return "\u2014"; return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export function TodaysTeamPresence() {
  const { selectedCompanyId, companies } = useCompanyFilter();
  const rows = useQuery(api.dashboard.getTodaysTeamPresence, { companyId: selectedCompanyId });
  const companiesById = new Map(companies?.map((c) => [c._id, c]) ?? []);
  return (
    <Card>
      <CardHeader><CardTitle>Today's Team Presence</CardTitle></CardHeader>
      <CardContent>
        {rows === undefined ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <Empty><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>No employees yet</EmptyTitle><EmptyDescription>Add employees to see their presence here</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Work Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Check-in</TableHead>
                <TableHead className="hidden sm:table-cell">Check-out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ employee, attendance }) => (
                <TableRow key={employee._id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm"><AvatarImage src={employee.photoUrl} /><AvatarFallback>{employee.fullName.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex flex-col leading-tight"><span className="font-medium">{employee.fullName}</span><span className="text-xs text-muted-foreground">{employee.position}</span></div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{companiesById.get(employee.companyId)?.name ?? "\u2014"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{WORK_MODE_LABEL[employee.workMode]}</TableCell>
                  <TableCell><AttendanceStatusBadge status={attendance?.status ?? "not_marked"} /></TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{formatTime(attendance?.checkInAt)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{formatTime(attendance?.checkOutAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

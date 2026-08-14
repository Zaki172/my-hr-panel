import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { Authenticated } from "convex/react";
import { ArrowLeft, Building2, Users, UserCircle2, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { EmployeeStatusBadge } from "@/components/status-badges.tsx";
import { ErrorState, ErrorStateHeader, ErrorStateMedia, ErrorStateTitle, ErrorStateDescription, ErrorStateContent } from "@/components/ui/error-state.tsx";
import { DepartmentFormDialog } from "../_components/department-form-dialog.tsx";
import { DeleteDepartmentDialog } from "../_components/delete-department-dialog.tsx";
import { EMPLOYMENT_TYPE_LABELS } from "../../employees/_lib/labels.ts";

type DeptDoc = Doc<"departments"> & { employeeCount?: number; headName?: string | null; companyName?: string | null };

export default function DepartmentDetail() {
  return <Authenticated><DepartmentDetailContent /></Authenticated>;
}

function DepartmentDetailContent() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const me = useQuery(api.me.getMe, {});
  const canManage = me?.role === "super_admin" || me?.role === "hr_manager";
  const data = useQuery(api.departments.get, departmentId ? { departmentId: departmentId as Id<"departments"> } : "skip");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (data === undefined) return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5"><Skeleton className="h-10 w-40" /><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>
  );
  if (data === null) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState><ErrorStateHeader><ErrorStateMedia variant="icon"><ShieldAlert /></ErrorStateMedia><ErrorStateTitle>Department not found</ErrorStateTitle><ErrorStateDescription>This department may have been removed.</ErrorStateDescription></ErrorStateHeader><ErrorStateContent><Button size="sm" className="cursor-pointer" onClick={() => navigate("/departments")}>Back to Departments</Button></ErrorStateContent></ErrorState>
    </div>
  );

  const { dept, employees, head, company } = data;
  const deptForForm: DeptDoc = { ...dept, employeeCount: employees.length, headName: head?.fullName ?? null, companyName: company?.name ?? null };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="cursor-pointer" onClick={() => navigate("/departments")}><ArrowLeft className="size-4" />Back</Button>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="cursor-pointer" onClick={() => setFormOpen(true)}><Pencil className="size-4" />Edit</Button>
            <Button variant="secondary" className="cursor-pointer text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />Delete</Button>
          </div>
        )}
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-7" /></div>
          <div className="flex flex-1 flex-col gap-1.5">
            <h1 className="font-serif text-2xl font-bold tracking-tight">{dept.name}</h1>
            {dept.description && <p className="text-sm text-muted-foreground">{dept.description}</p>}
            <div className="flex flex-wrap gap-4 pt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Building2 className="size-3.5" />{company?.name}</span>
              <span className="flex items-center gap-1.5"><Users className="size-3.5" />{employees.length} member{employees.length !== 1 ? "s" : ""}</span>
              {head && <span className="flex items-center gap-1.5"><UserCircle2 className="size-3.5" />Head: {head.fullName}</span>}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
        <CardContent>
          {employees.length === 0 ? <p className="text-sm text-muted-foreground">No employees assigned to this department yet.</p> : (
            <div className="divide-y">{employees.map((emp) => <EmployeeMemberRow key={emp._id} employee={emp} isHead={emp._id === dept.headEmployeeId} onClick={() => navigate(`/employees/${emp._id}`)} />)}</div>
          )}
        </CardContent>
      </Card>
      {canManage && (<><DepartmentFormDialog open={formOpen} onOpenChange={setFormOpen} department={deptForForm} /><DeleteDepartmentDialog department={deptForForm} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => navigate("/departments")} /></>)}
    </div>
  );
}

function EmployeeMemberRow({ employee, isHead, onClick }: { employee: Doc<"employees">; isHead: boolean; onClick: () => void }) {
  return (
    <div className="flex cursor-pointer items-center gap-3 py-3 transition-colors hover:bg-muted/40 rounded-lg px-2" onClick={onClick}>
      <Avatar className="size-9"><AvatarImage src={employee.photoUrl} /><AvatarFallback>{employee.fullName.charAt(0)}</AvatarFallback></Avatar>
      <div className="flex flex-1 flex-col leading-tight">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{employee.fullName}</span>
          {isHead && <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Head</span>}
        </div>
        <span className="text-xs text-muted-foreground">{employee.position}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-muted-foreground sm:block">{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</span>
        <EmployeeStatusBadge status={employee.status} />
      </div>
    </div>
  );
}

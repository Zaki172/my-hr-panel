import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { Authenticated } from "convex/react";
import { ArrowLeft, Pencil, Trash2, Mail, Phone, MapPin, Calendar, Building2, UserRound, Cake, ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { EmployeeStatusBadge } from "@/components/status-badges.tsx";
import { EmployeeFormDialog } from "../_components/employee-form-dialog.tsx";
import { DeleteEmployeeDialog } from "../_components/delete-employee-dialog.tsx";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, GENDER_LABELS } from "../_lib/labels.ts";
import { ErrorState, ErrorStateHeader, ErrorStateMedia, ErrorStateTitle, ErrorStateDescription, ErrorStateContent } from "@/components/ui/error-state.tsx";
import { EmployeeDocuments } from "./_components/employee-documents.tsx";
import { AttendanceTab } from "./_components/attendance-tab.tsx";
import { PerformanceTab } from "./_components/performance-tab.tsx";
import { TasksTab } from "./_components/tasks-tab.tsx";

export default function EmployeeProfile() {
  return <Authenticated><EmployeeProfileContent /></Authenticated>;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</div>
      <div className="flex flex-col leading-tight"><span className="text-xs text-muted-foreground">{label}</span><span className="text-sm font-medium">{value}</span></div>
    </div>
  );
}

function EmployeeProfileContent() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const me = useQuery(api.me.getMe, {});
  const canManage = me?.role === "super_admin" || me?.role === "hr_manager";
  const data = useQuery(api.employees.get, employeeId ? { employeeId: employeeId as Id<"employees"> } : "skip");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (data === undefined) return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5"><Skeleton className="h-10 w-40" /><Skeleton className="h-56 w-full" /><Skeleton className="h-72 w-full" /></div>
  );
  if (data === null) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState><ErrorStateHeader><ErrorStateMedia variant="icon"><ShieldAlert /></ErrorStateMedia><ErrorStateTitle>Employee not found</ErrorStateTitle><ErrorStateDescription>This employee profile may have been removed.</ErrorStateDescription></ErrorStateHeader><ErrorStateContent><Button size="sm" className="cursor-pointer" onClick={() => navigate("/employees")}>Back to Employees</Button></ErrorStateContent></ErrorState>
    </div>
  );

  const { employee, company, department, reportingManager } = data;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="cursor-pointer" onClick={() => navigate("/employees")}><ArrowLeft className="size-4" />Back</Button>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="cursor-pointer" onClick={() => setFormOpen(true)}><Pencil className="size-4" />Edit</Button>
            <Button variant="secondary" className="cursor-pointer text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />Remove</Button>
          </div>
        )}
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar className="size-20"><AvatarImage src={employee.photoUrl} /><AvatarFallback className="text-2xl">{employee.fullName.charAt(0)}</AvatarFallback></Avatar>
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center"><h1 className="font-serif text-2xl font-bold tracking-tight">{employee.fullName}</h1><EmployeeStatusBadge status={employee.status} /></div>
            <p className="text-muted-foreground">{employee.position}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
              <span>{employee.employeeCode}</span><span>•</span><span>{company?.name}</span><span>•</span><span>{department?.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="overview">
        <TabsList className="w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="overview" className="cursor-pointer">Overview</TabsTrigger>
          <TabsTrigger value="attendance" className="cursor-pointer">Attendance</TabsTrigger>
          <TabsTrigger value="performance" className="cursor-pointer">Performance</TabsTrigger>
          <TabsTrigger value="tasks" className="cursor-pointer">Tasks</TabsTrigger>
          <TabsTrigger value="files" className="cursor-pointer">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 flex flex-col gap-5">
          <Card>
            <CardHeader><CardTitle>Contact & Personal Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoRow icon={<Mail className="size-4" />} label="Email" value={employee.email} />
              <InfoRow icon={<Phone className="size-4" />} label="Phone" value={employee.phone ?? "\u2014"} />
              <InfoRow icon={<Cake className="size-4" />} label="Date of birth" value={employee.dateOfBirth ?? "\u2014"} />
              <InfoRow icon={<UserRound className="size-4" />} label="Gender" value={employee.gender ? GENDER_LABELS[employee.gender] : "\u2014"} />
              <InfoRow icon={<MapPin className="size-4" />} label="Address" value={employee.address ?? "\u2014"} />
              <InfoRow icon={<ShieldAlert className="size-4" />} label="Emergency contact" value={employee.emergencyContactName ? `${employee.emergencyContactName} (${employee.emergencyContactPhone ?? "\u2014"})` : "\u2014"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Employment Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoRow icon={<Building2 className="size-4" />} label="Company" value={company?.name ?? "\u2014"} />
              <InfoRow icon={<Building2 className="size-4" />} label="Department" value={department?.name ?? "\u2014"} />
              <InfoRow icon={<UserRound className="size-4" />} label="Employment type" value={EMPLOYMENT_TYPE_LABELS[employee.employmentType]} />
              <InfoRow icon={<Calendar className="size-4" />} label="Joining date" value={employee.joiningDate} />
              <InfoRow icon={<MapPin className="size-4" />} label="Office location" value={employee.officeLocation} />
              <InfoRow icon={<Building2 className="size-4" />} label="Work mode" value={WORK_MODE_LABELS[employee.workMode]} />
              <InfoRow icon={<UserRound className="size-4" />} label="Reporting manager" value={reportingManager?.fullName ?? "\u2014"} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab employeeId={employee._id} /></TabsContent>
        <TabsContent value="performance" className="mt-4"><PerformanceTab employeeId={employee._id} /></TabsContent>
        <TabsContent value="tasks" className="mt-4"><TasksTab employeeId={employee._id} /></TabsContent>
        <TabsContent value="files" className="mt-4"><EmployeeDocuments employeeId={employee._id} canManage={canManage} /></TabsContent>
      </Tabs>
      {canManage && (<><EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={employee} /><DeleteEmployeeDialog employee={deleteOpen ? employee : null} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => navigate("/employees")} /></>)}
    </div>
  );
}

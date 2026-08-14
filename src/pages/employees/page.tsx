import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Authenticated } from "convex/react";
import { Plus, Search, Users } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { EmployeeRow } from "./_components/employee-row.tsx";
import { EmployeeFormDialog } from "./_components/employee-form-dialog.tsx";
import { DeleteEmployeeDialog } from "./_components/delete-employee-dialog.tsx";
import { EMPLOYMENT_TYPE_LABELS, EMPLOYEE_STATUS_LABELS, toOptions } from "./_lib/labels.ts";

const ALL_VALUE = "all";

export default function Employees() {
  return <Authenticated><EmployeesContent /></Authenticated>;
}

function EmployeesContent() {
  const { selectedCompanyId, companies } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const canManage = me?.role === "super_admin" || me?.role === "hr_manager";
  const [searchInput, setSearchInput] = useState("");
  const [search] = useDebounce(searchInput, 300);
  const [departmentId, setDepartmentId] = useState(ALL_VALUE);
  const [status, setStatus] = useState(ALL_VALUE);
  const [employmentType, setEmploymentType] = useState(ALL_VALUE);
  const departments = useQuery(api.departments.list, { companyId: selectedCompanyId });
  const employees = useQuery(api.employees.list, { companyId: selectedCompanyId, departmentId: departmentId !== ALL_VALUE ? (departmentId as Doc<"departments">["_id"]) : undefined, status: status !== ALL_VALUE ? (status as Doc<"employees">["status"]) : undefined, employmentType: employmentType !== ALL_VALUE ? (employmentType as Doc<"employees">["employmentType"]) : undefined, search: search || undefined });
  const companiesById = useMemo(() => new Map(companies?.map((c) => [c._id, c])), [companies]);
  const departmentsById = useMemo(() => new Map(departments?.map((d) => [d._id, d])), [departments]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Doc<"employees"> | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Doc<"employees"> | null>(null);
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-2xl font-bold tracking-tight">People / Employees</h1><p className="text-sm text-muted-foreground">Manage employee profiles across Nakamura Travels and Innovate IT Hub.</p></div>
        {canManage && <Button className="cursor-pointer" onClick={() => { setEditingEmployee(null); setFormOpen(true); }}><Plus className="size-4" />Add Employee</Button>}
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by name, ID, position, or email\u2026" className="pl-9" /></div>
          <Select value={departmentId} onValueChange={setDepartmentId}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent><SelectItem value={ALL_VALUE}>All Departments</SelectItem>{departments?.map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Select value={employmentType} onValueChange={setEmploymentType}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value={ALL_VALUE}>All Types</SelectItem>{toOptions(EMPLOYMENT_TYPE_LABELS).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value={ALL_VALUE}>All Statuses</SelectItem>{toOptions(EMPLOYEE_STATUS_LABELS).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          {employees === undefined ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : employees.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>No employees found</EmptyTitle><EmptyDescription>Try adjusting your filters, or add a new employee to get started.</EmptyDescription></EmptyHeader>{canManage && <EmptyContent><Button size="sm" className="cursor-pointer" onClick={() => { setEditingEmployee(null); setFormOpen(true); }}>Add Employee</Button></EmptyContent>}</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Position</TableHead><TableHead className="hidden md:table-cell">Company</TableHead><TableHead className="hidden lg:table-cell">Department</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
              <TableBody>{employees.map((employee) => <EmployeeRow key={employee._id} employee={employee} companyName={companiesById.get(employee.companyId)?.name ?? "\u2014"} departmentName={departmentsById.get(employee.departmentId)?.name ?? "\u2014"} canManage={canManage} onEdit={() => { setEditingEmployee(employee); setFormOpen(true); }} onDelete={() => setDeletingEmployee(employee)} />)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {canManage && (<><EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editingEmployee} /><DeleteEmployeeDialog employee={deletingEmployee} open={deletingEmployee !== null} onOpenChange={(open) => !open && setDeletingEmployee(null)} onDeleted={() => setDeletingEmployee(null)} /></>)}
    </div>
  );
}

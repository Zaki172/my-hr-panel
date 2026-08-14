import { useState } from "react";
import { useQuery } from "convex/react";
import { Authenticated } from "convex/react";
import { Plus, Building2, Users, UserCircle2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { DepartmentFormDialog } from "./_components/department-form-dialog.tsx";
import { DeleteDepartmentDialog } from "./_components/delete-department-dialog.tsx";

type DeptDoc = Doc<"departments"> & { employeeCount: number; headName: string | null; companyName: string | null };

export default function Departments() {
  return <Authenticated><DepartmentsContent /></Authenticated>;
}

function DepartmentsContent() {
  const { selectedCompanyId } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const canManage = me?.role === "super_admin" || me?.role === "hr_manager";
  const navigate = useNavigate();
  const departments = useQuery(api.departments.list, { companyId: selectedCompanyId }) as DeptDoc[] | undefined;
  const [formOpen, setFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DeptDoc | null>(null);
  const [deletingDept, setDeletingDept] = useState<DeptDoc | null>(null);
  const grouped = departments?.reduce<Record<string, DeptDoc[]>>((acc, d) => { const key = d.companyName ?? "Unknown"; if (!acc[key]) acc[key] = []; acc[key].push(d); return acc; }, {});
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-2xl font-bold tracking-tight">Departments</h1><p className="text-sm text-muted-foreground">Manage organisational departments across both companies.</p></div>
        {canManage && <Button className="cursor-pointer" onClick={() => { setEditingDept(null); setFormOpen(true); }}><Plus className="size-4" />Add Department</Button>}
      </div>
      {departments === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}</div>
      ) : departments.length === 0 ? (
        <Empty><EmptyHeader><EmptyMedia variant="icon"><Building2 /></EmptyMedia><EmptyTitle>No departments yet</EmptyTitle><EmptyDescription>Create your first department to organise your teams.</EmptyDescription></EmptyHeader>{canManage && <EmptyContent><Button size="sm" className="cursor-pointer" onClick={() => { setEditingDept(null); setFormOpen(true); }}>Add Department</Button></EmptyContent>}</Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(grouped ?? {}).map(([companyName, depts]) => (
            <div key={companyName} className="flex flex-col gap-3">
              <div className="flex items-center gap-2"><Badge variant="secondary" className="text-xs font-semibold">{companyName}</Badge><span className="text-xs text-muted-foreground">{depts.length} department{depts.length !== 1 ? "s" : ""}</span></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {depts.map((dept) => <DepartmentCard key={dept._id} dept={dept} canManage={canManage} onView={() => navigate(`/departments/${dept._id}`)} onEdit={() => { setEditingDept(dept); setFormOpen(true); }} onDelete={() => setDeletingDept(dept)} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      {canManage && <><DepartmentFormDialog open={formOpen} onOpenChange={setFormOpen} department={editingDept} /><DeleteDepartmentDialog department={deletingDept} open={deletingDept !== null} onOpenChange={(open) => !open && setDeletingDept(null)} /></>}
    </div>
  );
}

function DepartmentCard({ dept, canManage, onView, onEdit, onDelete }: { dept: DeptDoc; canManage: boolean; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-md" onClick={onView}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="size-5" /></div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex size-7 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="size-4" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex flex-col gap-0.5"><h3 className="font-semibold leading-tight">{dept.name}</h3>{dept.description && <p className="line-clamp-2 text-xs text-muted-foreground">{dept.description}</p>}</div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Users className="size-3.5" /><span>{dept.employeeCount} member{dept.employeeCount !== 1 ? "s" : ""}</span></div>
          {dept.headName && <div className="flex items-center gap-1.5"><UserCircle2 className="size-3.5" /><span className="truncate">{dept.headName}</span></div>}
        </div>
      </CardContent>
    </Card>
  );
}

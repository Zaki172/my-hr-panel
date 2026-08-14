import { MoreVertical, Pencil, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { EmployeeStatusBadge } from "@/components/status-badges.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TableCell, TableRow } from "@/components/ui/table.tsx";
import { EMPLOYMENT_TYPE_LABELS } from "../_lib/labels.ts";

export function EmployeeRow({ employee, companyName, departmentName, canManage, onEdit, onDelete }: { employee: Doc<"employees">; companyName: string; departmentName: string; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const navigate = useNavigate();
  return (
    <TableRow className="cursor-pointer" onClick={() => navigate(`/employees/${employee._id}`)}>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar><AvatarImage src={employee.photoUrl} /><AvatarFallback>{employee.fullName.charAt(0)}</AvatarFallback></Avatar>
          <div className="flex flex-col leading-tight"><span className="font-medium">{employee.fullName}</span><span className="text-xs text-muted-foreground">{employee.employeeCode}</span></div>
        </div>
      </TableCell>
      <TableCell className="text-sm">{employee.position}</TableCell>
      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{companyName}</TableCell>
      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{departmentName}</TableCell>
      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</TableCell>
      <TableCell><EmployeeStatusBadge status={employee.status} /></TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="cursor-pointer"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(`/employees/${employee._id}`)}><Eye className="size-4" />View profile</DropdownMenuItem>
            {canManage && (<><DropdownMenuItem className="cursor-pointer" onClick={onEdit}><Pencil className="size-4" />Edit</DropdownMenuItem><DropdownMenuItem className="cursor-pointer text-destructive" onClick={onDelete}><Trash2 className="size-4" />Remove</DropdownMenuItem></>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

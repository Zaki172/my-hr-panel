import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated } from "convex/react";
import { format } from "date-fns";
import {
  Building2, Users, Calendar, ClipboardCheck, Plus, Trash2,
  Save, ShieldAlert, CheckSquare, Square, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  hr_manager: "HR Manager",
  manager: "Manager",
  employee: "Employee",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  hr_manager: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  manager: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  employee: "bg-muted text-muted-foreground",
};

const CHECKLIST_ITEMS: { key: string; label: string; description: string }[] = [
  { key: "personalInfoSubmitted", label: "Personal Info Submitted", description: "Employee filled out personal details" },
  { key: "contractSigned", label: "Contract Signed", description: "Employment contract reviewed and signed" },
  { key: "companyEmailCreated", label: "Company Email Created", description: "Official company email assigned" },
  { key: "systemAccountCreated", label: "System Access Granted", description: "Logins and system accounts set up" },
  { key: "departmentAssigned", label: "Department Assigned", description: "Assigned to correct department" },
  { key: "managerAssigned", label: "Manager Assigned", description: "Reporting manager set" },
  { key: "trainingCompleted", label: "Training Completed", description: "Completed required onboarding training" },
  { key: "policyReviewed", label: "Policy Reviewed", description: "Company policies read and acknowledged" },
  { key: "documentsUploaded", label: "Documents Uploaded", description: "ID, certificates, and other docs uploaded" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Authenticated>
      <SettingsContent />
    </Authenticated>
  );
}

function SettingsContent() {
  const me = useQuery(api.me.getMe, {});
  const isAdmin = me?.role === "super_admin" || me?.role === "hr_manager";
  const { selectedCompanyId } = useCompanyFilter();

  if (me === undefined) return <SettingsSkeleton />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
            <EmptyTitle>Admin Access Required</EmptyTitle>
            <EmptyDescription>Settings are only available to HR Managers and Super Admins.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage company info, access control, holidays, and employee onboarding.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general"><Building2 className="size-3.5" /> General</TabsTrigger>
          <TabsTrigger value="roles"><Users className="size-3.5" /> Access &amp; Roles</TabsTrigger>
          <TabsTrigger value="holidays"><Calendar className="size-3.5" /> Holidays</TabsTrigger>
          <TabsTrigger value="onboarding"><ClipboardCheck className="size-3.5" /> Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesTab companyId={selectedCompanyId} isSuperAdmin={me.role === "super_admin"} />
        </TabsContent>
        <TabsContent value="holidays" className="mt-4">
          <HolidaysTab companyId={selectedCompanyId} />
        </TabsContent>
        <TabsContent value="onboarding" className="mt-4">
          <OnboardingTab companyId={selectedCompanyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

const companySchema = z.object({
  name: z.string().min(1, "Required"),
  tagline: z.string().min(1, "Required"),
  industry: z.string().min(1, "Required"),
});
type CompanyForm = z.infer<typeof companySchema>;

function GeneralTab() {
  const companies = useQuery(api.companies.list, {});
  const updateCompany = useMutation(api.settings.updateCompany);

  if (!companies) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Update company name, tagline, and industry. Changes are reflected across the entire app.
      </p>
      {companies.map((company) => (
        <CompanyCard
          key={company._id}
          company={company}
          onSave={async (data) => {
            try {
              await updateCompany({ companyId: company._id, ...data });
              toast.success(`${data.name} updated`);
            } catch (err) {
              if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
              else toast.error("Failed to update company");
            }
          }}
        />
      ))}
    </div>
  );
}

function CompanyCard({
  company,
  onSave,
}: {
  company: { _id: Id<"companies">; name: string; tagline: string; industry: string; slug: string };
  onSave: (data: CompanyForm) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<CompanyForm, unknown, CompanyForm>({
    resolver: zodResolver(companySchema) as Resolver<CompanyForm>,
    defaultValues: { name: company.name, tagline: company.tagline, industry: company.industry },
  });

  const onSubmit = async (data: CompanyForm) => {
    await onSave(data);
    reset(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4 text-primary" />
          {company.name}
          <Badge variant="secondary" className="ml-auto font-mono text-xs">{company.slug}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Company Name</Label>
              <Input {...register("name")} placeholder="Company Name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tagline</Label>
              <Input {...register("tagline")} placeholder="e.g. Travel with Confidence" />
              {errors.tagline && <p className="text-xs text-destructive">{errors.tagline.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Industry</Label>
              <Input {...register("industry")} placeholder="e.g. Travel Agency" />
              {errors.industry && <p className="text-xs text-destructive">{errors.industry.message}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || isSubmitting} size="sm">
              <Save className="size-4" />
              {isSubmitting ? "Saving\u2026" : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({
  companyId,
  isSuperAdmin,
}: {
  companyId: ReturnType<typeof useCompanyFilter>["selectedCompanyId"];
  isSuperAdmin: boolean;
}) {
  const data = useQuery(api.settings.listUserRoles, { companyId });
  const setRole = useMutation(api.settings.setUserRole);

  if (!data) return <Skeleton className="h-64 w-full" />;

  const linked = data.filter((d) => d.employee.userId);
  const unlinked = data.filter((d) => !d.employee.userId);

  const handleRoleChange = async (employeeId: Id<"employees">, role: string) => {
    try {
      await setRole({ employeeId, role: role as "super_admin" | "hr_manager" | "manager" | "employee" });
      toast.success("Role updated");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to update role");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Role Management</CardTitle>
          <CardDescription>
            Assign roles to employees who have linked their accounts. Employees must sign in before a role can be assigned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No employees have linked their accounts yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              {linked.map(({ employee, role }) => (
                <div key={employee._id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar className="size-9">
                    <AvatarImage src={employee.photoUrl ?? undefined} />
                    <AvatarFallback className="text-sm">{employee.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{employee.fullName}</p>
                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                  </div>
                  {isSuperAdmin ? (
                    <Select
                      value={role ?? "employee"}
                      onValueChange={(v) => void handleRoleChange(employee._id, v)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="hr_manager">HR Manager</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ROLE_COLORS[role ?? "employee"]
                      }`}
                    >
                      {ROLE_LABELS[role ?? "employee"]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {unlinked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Employees Without Accounts</CardTitle>
            <CardDescription>{"These employees haven't signed in yet. Roles can be assigned once they link their account."}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y">
              {unlinked.slice(0, 8).map(({ employee }) => (
                <div key={employee._id} className="flex items-center gap-3 py-2.5">
                  <Avatar className="size-8">
                    <AvatarImage src={employee.photoUrl ?? undefined} />
                    <AvatarFallback className="text-xs">{employee.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-muted-foreground">{employee.fullName}</span>
                  <Badge variant="outline" className="text-xs">No account</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Holidays Tab ─────────────────────────────────────────────────────────────

const holidaySchema = z.object({
  name: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  scope: z.enum(["all", "company"]),
});
type HolidayForm = z.infer<typeof holidaySchema>;

function HolidaysTab({ companyId }: { companyId: ReturnType<typeof useCompanyFilter>["selectedCompanyId"] }) {
  const holidays = useQuery(api.onboarding.listHolidays, { companyId });
  const addHoliday = useMutation(api.onboarding.addHoliday);
  const removeHoliday = useMutation(api.onboarding.removeHoliday);
  const companies = useQuery(api.companies.list, {});
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Id<"holidays"> | null>(null);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<HolidayForm, unknown, HolidayForm>({
    resolver: zodResolver(holidaySchema) as Resolver<HolidayForm>,
    defaultValues: { name: "", date: "", scope: "all" },
  });

  const scope = watch("scope");

  const onAdd = async (data: HolidayForm) => {
    try {
      const targetCompanyId = data.scope === "company" && companyId ? companyId : undefined;
      await addHoliday({ name: data.name, date: data.date, companyId: targetCompanyId });
      toast.success("Holiday added");
      reset();
      setAddOpen(false);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to add holiday");
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeHoliday({ holidayId: deleteTarget });
      toast.success("Holiday removed");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to remove holiday");
    }
    setDeleteTarget(null);
  };

  const grouped: Record<string, typeof holidays> = {};
  if (holidays) {
    for (const h of holidays) {
      const year = h.date.slice(0, 4);
      if (!grouped[year]) grouped[year] = [];
      grouped[year]!.push(h);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage public holidays. These appear in the schedule and are used for leave calculations.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Add Holiday
        </Button>
      </div>

      {!holidays ? (
        <Skeleton className="h-40 w-full" />
      ) : holidays.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Calendar /></EmptyMedia>
            <EmptyTitle>No holidays added yet</EmptyTitle>
            <EmptyDescription>Add public holidays to help with scheduling and leave management.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add Holiday</Button>
          </EmptyContent>
        </Empty>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([year, items]) => (
            <Card key={year}>
              <CardHeader>
                <CardTitle className="text-base">{year}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col divide-y">
                  {items!.map((h) => (
                    <div key={h._id} className="flex items-center gap-3 py-2.5">
                      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="text-xs font-bold uppercase leading-none">
                          {format(new Date(h.date + "T00:00:00"), "MMM")}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {format(new Date(h.date + "T00:00:00"), "d")}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(h.date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                          {h.companyId && companies && (
                            <span className="ml-2 text-primary">
                              \u00b7 {companies.find((c) => c._id === h.companyId)?.name ?? "Company"}
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => setDeleteTarget(h._id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAdd)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Holiday Name</Label>
              <Input {...register("name")} placeholder="e.g. New Year's Day" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date</Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Applies to</Label>
              <Select value={scope} onValueChange={(v) => reset({ ...{ name: "", date: "" }, scope: v as "all" | "company" })}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="company">Selected Company Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding\u2026" : "Add Holiday"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Holiday?</AlertDialogTitle>
            <AlertDialogDescription>This holiday will be removed from the calendar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Onboarding Tab ───────────────────────────────────────────────────────────

function OnboardingTab({ companyId }: { companyId: ReturnType<typeof useCompanyFilter>["selectedCompanyId"] }) {
  const checklists = useQuery(api.onboarding.listAll, { companyId });
  const upsert = useMutation(api.onboarding.upsert);
  const employees = useQuery(api.employees.list, { companyId: companyId ?? undefined });
  const [selected, setSelected] = useState<(typeof checklists extends (infer T)[] | null | undefined ? T : never) | null>(null);
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const initChecklist = useMutation(api.onboarding.initForEmployee);

  if (!checklists) return <Skeleton className="h-64 w-full" />;

  const handleToggle = async (
    checklist: {
      employeeId: Id<"employees">;
      personalInfoSubmitted: boolean;
      contractSigned: boolean;
      companyEmailCreated: boolean;
      systemAccountCreated: boolean;
      departmentAssigned: boolean;
      managerAssigned: boolean;
      trainingCompleted: boolean;
      policyReviewed: boolean;
      documentsUploaded: boolean;
    },
    key: string,
    value: boolean,
  ) => {
    try {
      await upsert({
        employeeId: checklist.employeeId,
        personalInfoSubmitted: key === "personalInfoSubmitted" ? value : checklist.personalInfoSubmitted,
        contractSigned: key === "contractSigned" ? value : checklist.contractSigned,
        companyEmailCreated: key === "companyEmailCreated" ? value : checklist.companyEmailCreated,
        systemAccountCreated: key === "systemAccountCreated" ? value : checklist.systemAccountCreated,
        departmentAssigned: key === "departmentAssigned" ? value : checklist.departmentAssigned,
        managerAssigned: key === "managerAssigned" ? value : checklist.managerAssigned,
        trainingCompleted: key === "trainingCompleted" ? value : checklist.trainingCompleted,
        policyReviewed: key === "policyReviewed" ? value : checklist.policyReviewed,
        documentsUploaded: key === "documentsUploaded" ? value : checklist.documentsUploaded,
      });
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to update");
    }
  };

  const handleInit = async () => {
    if (!selectedEmployeeId) return;
    try {
      await initChecklist({ employeeId: selectedEmployeeId as Id<"employees"> });
      toast.success("Onboarding checklist created");
      setInitDialogOpen(false);
      setSelectedEmployeeId("");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to create checklist");
    }
  };

  const existingIds = new Set(checklists.map((c) => c?.employeeId));
  const withoutChecklist = employees?.filter((e) => !existingIds.has(e._id)) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track onboarding progress for new employees. Check off items as they are completed.
        </p>
        {withoutChecklist.length > 0 && (
          <Button size="sm" onClick={() => setInitDialogOpen(true)}>
            <Plus className="size-4" /> Start Onboarding
          </Button>
        )}
      </div>

      {checklists.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ClipboardCheck /></EmptyMedia>
            <EmptyTitle>No onboarding checklists yet</EmptyTitle>
            <EmptyDescription>Start an onboarding checklist for a new employee to track their progress.</EmptyDescription>
          </EmptyHeader>
          {withoutChecklist.length > 0 && (
            <EmptyContent>
              <Button size="sm" onClick={() => setInitDialogOpen(true)}>
                <Plus className="size-4" /> Start Onboarding
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {checklists.map((c) => {
            if (!c) return null;
            const isExpanded = selected?.employeeId === c.employeeId;
            return (
              <Card key={c._id} className="cursor-pointer transition-shadow hover:shadow-sm">
                <CardContent className="flex flex-col gap-3">
                  <div
                    className="flex items-center gap-3"
                    onClick={() => setSelected(isExpanded ? null : c)}
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={c.employeePhoto ?? undefined} />
                      <AvatarFallback className="text-sm">{c.employeeName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{c.employeeCode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${c.progress === 100 ? "text-emerald-500" : "text-primary"}`}>
                        {c.progress}%
                      </span>
                      <ChevronRight className={`size-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  <Progress value={c.progress} className="h-1.5" />

                  <p className="text-xs text-muted-foreground">
                    {c.completedCount} of {c.totalCount} steps complete
                    {c.progress === 100 && (
                      <span className="ml-2 font-semibold text-emerald-500">\u2713 Done</span>
                    )}
                  </p>

                  {isExpanded && (
                    <div className="flex flex-col gap-2 border-t pt-3">
                      {CHECKLIST_ITEMS.map((item) => {
                        const checked = (c as Record<string, unknown>)[item.key] as boolean;
                        return (
                          <div
                            key={item.key}
                            className="flex items-start gap-2.5 cursor-pointer"
                            onClick={() => void handleToggle(c, item.key, !checked)}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => void handleToggle(c, item.key, !!v)}
                              className="mt-0.5 cursor-pointer"
                            />
                            <div>
                              <p className={`text-sm font-medium leading-tight ${checked ? "line-through text-muted-foreground" : ""}`}>
                                {item.label}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Employee Onboarding</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Select Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Choose an employee\u2026" />
                </SelectTrigger>
                <SelectContent>
                  {withoutChecklist.map((e) => (
                    <SelectItem key={e._id} value={e._id}>{e.fullName} \u2014 {e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInit} disabled={!selectedEmployeeId}>
              Start Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-full max-w-sm" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

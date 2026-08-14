import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated } from "convex/react";
import { format } from "date-fns";
import { Plus, Megaphone, Trash2, Users, Building2, LayoutGrid, Globe } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { CreateAnnouncementDialog, CATEGORY_LABELS, TARGET_LABELS } from "./_components/create-announcement-dialog.tsx";

const CATEGORY_COLORS: Record<string, string> = { holiday: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", new_employee: "bg-sky-500/15 text-sky-700 dark:text-sky-300", meeting: "bg-purple-500/15 text-purple-700 dark:text-purple-300", policy_update: "bg-amber-500/15 text-amber-700 dark:text-amber-300", training: "bg-teal-500/15 text-teal-700 dark:text-teal-300", emergency: "bg-red-500/15 text-red-700 dark:text-red-300" };
const CATEGORY_EMOJIS: Record<string, string> = { holiday: "\u{1F3D6}\uFE0F", new_employee: "\u{1F44B}", meeting: "\u{1F4C5}", policy_update: "\u{1F4CB}", training: "\u{1F393}", emergency: "\u{1F6A8}" };

type Announcement = { _id: Id<"announcements">; _creationTime: number; title: string; content: string; category: string; targetType: string; targetCompanyId?: Id<"companies">; targetDepartmentId?: Id<"departments">; targetEmployeeIds?: Id<"employees">[]; createdBy: Id<"employees">; creatorName: string | null; creatorPhoto: string | null; targetCompanyName: string | null; targetDepartmentName: string | null };

const ALL = "all";

export default function Announcements() {
  return <Authenticated><AnnouncementsContent /></Authenticated>;
}

function AnnouncementsContent() {
  const { selectedCompanyId } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const isManager = me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager";
  const myEmployeeId = me?.employee?._id;
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [deleteTarget, setDeleteTarget] = useState<Id<"announcements"> | null>(null);
  const announcements = useQuery(api.announcements.list, { companyId: selectedCompanyId }) as Announcement[] | undefined;
  const deleteAnn = useMutation(api.announcements.remove);
  const filtered = announcements?.filter((a) => categoryFilter === ALL || a.category === categoryFilter);
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteAnn({ announcementId: deleteTarget }); toast.success("Announcement deleted"); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to delete"); }
    setDeleteTarget(null);
  };
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-2xl font-bold tracking-tight">Announcements</h1><p className="text-sm text-muted-foreground">Company-wide and targeted communications for your team.</p></div>
        {isManager && <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Post Announcement</Button>}
      </div>
      {announcements !== undefined && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="flex items-center gap-3"><Megaphone className="size-5 text-primary" /><div><p className="text-2xl font-bold">{announcements.length}</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
          {(["holiday", "meeting", "emergency"] as const).map((cat) => (<Card key={cat}><CardContent className="flex items-center gap-3"><span className="text-xl">{CATEGORY_EMOJIS[cat]}</span><div><p className="text-2xl font-bold">{announcements.filter((a) => a.category === cat).length}</p><p className="text-xs text-muted-foreground">{CATEGORY_LABELS[cat]}</p></div></CardContent></Card>))}
        </div>
      )}
      <Card><CardContent><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-52"><SelectValue placeholder="All Categories" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All Categories</SelectItem>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></CardContent></Card>
      {filtered === undefined ? (<div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>)
        : filtered.length === 0 ? (<Empty><EmptyHeader><EmptyMedia variant="icon"><Megaphone /></EmptyMedia><EmptyTitle>No announcements yet</EmptyTitle><EmptyDescription>{isManager ? "Post an announcement to share news with your team." : "No announcements have been posted for you yet."}</EmptyDescription></EmptyHeader>{isManager && <EmptyContent><Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Post Announcement</Button></EmptyContent>}</Empty>)
        : (<div className="flex flex-col gap-3">{filtered.map((ann) => <AnnouncementCard key={ann._id} announcement={ann} canDelete={isManager && (ann.createdBy === myEmployeeId || me?.role === "super_admin" || me?.role === "hr_manager")} onDelete={() => setDeleteTarget(ann._id)} />)}</div>)}
      <CreateAnnouncementDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Announcement?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function TargetIcon({ targetType }: { targetType: string }) {
  if (targetType === "everyone") return <Globe className="size-3.5" />;
  if (targetType === "company") return <Building2 className="size-3.5" />;
  if (targetType === "department") return <LayoutGrid className="size-3.5" />;
  return <Users className="size-3.5" />;
}

function AnnouncementCard({ announcement: ann, canDelete, onDelete }: { announcement: Announcement; canDelete: boolean; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = ann.content.length > 200;
  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-xl ${CATEGORY_COLORS[ann.category] ?? "bg-muted"}`}>{CATEGORY_EMOJIS[ann.category] ?? "\u{1F4E2}"}</div>
            <div className="flex flex-col gap-1 min-w-0">
              <h3 className="font-semibold leading-tight">{ann.title}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${CATEGORY_COLORS[ann.category] ?? "bg-muted text-muted-foreground"}`}>{CATEGORY_LABELS[ann.category] ?? ann.category}</span>
                <span className="flex items-center gap-1"><TargetIcon targetType={ann.targetType} />{ann.targetType === "company" && ann.targetCompanyName ? ann.targetCompanyName : ann.targetType === "department" && ann.targetDepartmentName ? ann.targetDepartmentName : TARGET_LABELS[ann.targetType] ?? ann.targetType}</span>
                <span>{format(new Date(ann._creationTime), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          {canDelete && <Button size="icon" variant="ghost" className="shrink-0 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="size-4" /></Button>}
        </div>
        <div>
          <p className={`text-sm leading-relaxed text-muted-foreground ${!expanded && isLong ? "line-clamp-3" : ""}`}>{ann.content}</p>
          {isLong && <button type="button" className="mt-1 cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => setExpanded((p) => !p)}>{expanded ? "Show less" : "Read more"}</button>}
        </div>
        <div className="flex items-center gap-2 border-t pt-2"><Avatar className="size-6"><AvatarImage src={ann.creatorPhoto ?? undefined} /><AvatarFallback className="text-[10px]">{(ann.creatorName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="text-xs text-muted-foreground">Posted by <span className="font-medium text-foreground">{ann.creatorName ?? "Unknown"}</span></span></div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated } from "convex/react";
import { format } from "date-fns";
import { Plus, Star, TrendingUp, Edit2, Trash2, BarChart3 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { ReviewFormDialog } from "./_components/review-form-dialog.tsx";
import { SCORE_FIELDS, scoreColor, scoreBg, scoreLabel, type Review } from "./_components/perf-utils.ts";

const ALL = "all";

export default function Performance() {
  return <Authenticated><PerformanceContent /></Authenticated>;
}

function PerformanceContent() {
  const { selectedCompanyId } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const isManager = me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager";
  const [periodFilter, setPeriodFilter] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Review | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Id<"performanceReviews"> | null>(null);
  const allReviews = useQuery(api.performance.listForCompany, isManager ? { companyId: selectedCompanyId, periodType: periodFilter !== ALL ? (periodFilter as Review["periodType"]) : undefined } : "skip") as Review[] | undefined;
  const myReviews = useQuery(api.performance.getMyReviews, !isManager ? {} : "skip") as Review[] | undefined;
  const deleteReview = useMutation(api.performance.remove);
  const reviews = isManager ? allReviews : myReviews;
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteReview({ reviewId: deleteTarget }); toast.success("Review deleted"); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to delete"); }
    setDeleteTarget(null);
  };
  const avgScore = reviews && reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length) * 10) / 10 : null;
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-2xl font-bold tracking-tight">Performance Management</h1><p className="text-sm text-muted-foreground">{isManager ? "Track and evaluate team performance across all categories." : "View your performance reviews and scores."}</p></div>
        {isManager && <Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><Plus className="size-4" /> New Review</Button>}
      </div>
      {reviews !== undefined && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="flex items-center gap-3"><BarChart3 className="size-5 text-primary" /><div><p className="text-2xl font-bold">{reviews.length}</p><p className="text-xs text-muted-foreground">Total Reviews</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3"><Star className="size-5 text-amber-500" /><div><p className={`text-2xl font-bold ${avgScore !== null ? scoreColor(avgScore) : ""}`}>{avgScore !== null ? avgScore.toFixed(1) : "\u2014"}</p><p className="text-xs text-muted-foreground">Avg Score</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3"><TrendingUp className="size-5 text-emerald-500" /><div><p className="text-2xl font-bold">{reviews.filter((r) => r.overallScore >= 4).length}</p><p className="text-xs text-muted-foreground">High Performers</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3"><TrendingUp className="size-5 text-red-400 rotate-180" /><div><p className="text-2xl font-bold">{reviews.filter((r) => r.overallScore < 3).length}</p><p className="text-xs text-muted-foreground">Needs Improvement</p></div></CardContent></Card>
        </div>
      )}
      {isManager && (<Card><CardContent className="flex items-center gap-3"><Select value={periodFilter} onValueChange={setPeriodFilter}><SelectTrigger className="w-44"><SelectValue placeholder="Period Type" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All Periods</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></CardContent></Card>)}
      {isManager ? (<ReviewList reviews={reviews} isManager onEdit={(r) => { setEditTarget(r); setFormOpen(true); }} onDelete={(id) => setDeleteTarget(id)} />) : (
        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger><TabsTrigger value="quarterly">Quarterly</TabsTrigger><TabsTrigger value="yearly">Yearly</TabsTrigger></TabsList>
          {["all", "monthly", "quarterly", "yearly"].map((tab) => (<TabsContent key={tab} value={tab}><ReviewList reviews={myReviews === undefined ? undefined : tab === "all" ? myReviews : myReviews.filter((r) => r.periodType === tab)} isManager={false} /></TabsContent>))}
        </Tabs>
      )}
      <ReviewFormDialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditTarget(null); }} companyId={selectedCompanyId} editReview={editTarget} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Review?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function ReviewList({ reviews, isManager, onEdit, onDelete }: { reviews: Review[] | undefined; isManager: boolean; onEdit?: (r: Review) => void; onDelete?: (id: Id<"performanceReviews">) => void }) {
  if (reviews === undefined) return (<div className="mt-3 flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>);
  if (reviews.length === 0) return (<div className="mt-3"><Empty><EmptyHeader><EmptyMedia variant="icon"><Star /></EmptyMedia><EmptyTitle>No performance reviews yet</EmptyTitle><EmptyDescription>{isManager ? "Create a new review to evaluate team members." : "Your performance reviews will appear here once submitted by your manager."}</EmptyDescription></EmptyHeader>{isManager && onEdit && <EmptyContent><Button size="sm" onClick={() => onEdit({} as Review)}><Plus className="size-4" /> New Review</Button></EmptyContent>}</Empty></div>);
  return (<div className="mt-3 flex flex-col gap-3">{reviews.map((rev) => <ReviewCard key={rev._id} review={rev} isManager={isManager} onEdit={onEdit ? () => onEdit(rev) : undefined} onDelete={onDelete ? () => onDelete(rev._id) : undefined} />)}</div>);
}

function ReviewCard({ review, isManager, onEdit, onDelete }: { review: Review; isManager: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const periodBadgeClass = review.periodType === "yearly" ? "bg-purple-500/15 text-purple-700 dark:text-purple-300" : review.periodType === "quarterly" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-primary/10 text-primary";
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {isManager && (<Avatar className="size-10 shrink-0"><AvatarImage src={review.employeePhoto ?? undefined} /><AvatarFallback className="text-xs">{(review.employeeName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>)}
            <div>
              {isManager && <p className="font-semibold leading-tight">{review.employeeName ?? "Unknown"}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-0.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${periodBadgeClass}`}>{review.periodLabel}</span><Badge variant="outline" className="text-xs capitalize">{review.periodType}</Badge>{review.reviewerName && !isManager && <span className="text-xs text-muted-foreground">by {review.reviewerName}</span>}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center rounded-lg border px-3 py-1.5 min-w-[60px]"><span className={`text-xl font-bold ${scoreColor(review.overallScore)}`}>{review.overallScore.toFixed(1)}</span><span className="text-[10px] text-muted-foreground">{scoreLabel(review.overallScore)}</span></div>
            {isManager && (<><Button size="icon" variant="ghost" onClick={onEdit}><Edit2 className="size-4" /></Button><Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="size-4" /></Button></>)}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCORE_FIELDS.map(({ key, label }) => { const val = review[key] as number; return (<div key={key} className="flex items-center gap-2"><span className="w-36 truncate text-xs text-muted-foreground">{label}</span><Progress value={(val / 5) * 100} className="h-1.5 flex-1" indicatorClassName={scoreBg(val)} /><span className={`w-4 text-xs font-semibold ${scoreColor(val)}`}>{val}</span></div>); })}
        </div>
        {review.feedback && (<div><button type="button" className="text-xs font-medium text-primary hover:underline cursor-pointer" onClick={() => setExpanded((p) => !p)}>{expanded ? "Hide" : "Show"} feedback</button>{expanded && <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{review.feedback}</p>}</div>)}
      </CardContent>
    </Card>
  );
}

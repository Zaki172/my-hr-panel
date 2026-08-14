import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { LeaveStatusBadge } from "@/components/status-badges.tsx";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge.tsx";

const LEAVE_TYPE_LABELS: Record<string, string> = { annual: "Annual Leave", sick: "Sick Leave", casual: "Casual Leave", emergency: "Emergency Leave", unpaid: "Unpaid Leave" };

type LeaveRequest = { _id: Id<"leaveRequests">; employeeName: string | null; employeePhoto: string | null; employeeCode: string | null; leaveType: string; startDate: string; endDate: string; numberOfDays: number; reason: string; emergencyContact?: string; status: "pending" | "approved" | "rejected"; reviewNote?: string; reviewerName: string | null; reviewedAt?: string };

export function ReviewLeaveDialog({ open, onOpenChange, request }: { open: boolean; onOpenChange: (open: boolean) => void; request: LeaveRequest | null }) {
  const review = useMutation(api.leave.review);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  if (!request) return null;
  const handleAction = async (action: "approved" | "rejected") => {
    setSaving(true);
    try { await review({ requestId: request._id, action, reviewNote: note || undefined }); toast.success(`Leave request ${action}`); onOpenChange(false); setNote(""); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Action failed"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Review Leave Request</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"><Avatar className="size-10"><AvatarImage src={request.employeePhoto ?? undefined} /><AvatarFallback>{(request.employeeName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-semibold">{request.employeeName ?? "Unknown"}</p><p className="text-xs text-muted-foreground">{request.employeeCode}</p></div><LeaveStatusBadge status={request.status} className="ml-auto" /></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-foreground">Leave Type</span><Badge variant="secondary" className="w-fit">{LEAVE_TYPE_LABELS[request.leaveType] ?? request.leaveType}</Badge></div>
            <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-foreground">Duration</span><span className="font-medium">{request.numberOfDays} day{request.numberOfDays !== 1 ? "s" : ""}</span></div>
            <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-foreground">Start Date</span><span className="font-medium">{format(new Date(request.startDate + "T00:00:00"), "MMM d, yyyy")}</span></div>
            <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-foreground">End Date</span><span className="font-medium">{format(new Date(request.endDate + "T00:00:00"), "MMM d, yyyy")}</span></div>
          </div>
          <div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Reason</span><p className="rounded-md bg-muted/40 px-3 py-2 text-sm">{request.reason}</p></div>
          {request.emergencyContact && <div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Emergency Contact</span><p className="text-sm">{request.emergencyContact}</p></div>}
          {request.status === "pending" && <div className="flex flex-col gap-1.5"><Label>Review Note (optional)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the employee\u2026" rows={2} /></div>}
          {request.status !== "pending" && request.reviewNote && <div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Review Note</span><p className="rounded-md bg-muted/40 px-3 py-2 text-sm">{request.reviewNote}</p></div>}
        </div>
        <DialogFooter>{request.status === "pending" ? (<><Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button><Button variant="destructive" onClick={() => handleAction("rejected")} disabled={saving}>Reject</Button><Button onClick={() => handleAction("approved")} disabled={saving}>Approve</Button></>) : <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

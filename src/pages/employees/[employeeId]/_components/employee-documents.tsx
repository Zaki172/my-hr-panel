import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import { Upload, Download, Eye, Trash2, Lock, FileText } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { UploadDocumentDialog } from "@/pages/documents/_components/upload-document-dialog.tsx";
import { CATEGORY_LABELS, CATEGORY_COLORS, formatFileSize, fileIcon } from "@/pages/documents/_components/doc-utils.ts";

export function EmployeeDocuments({ employeeId, canManage }: { employeeId: Id<"employees">; canManage: boolean }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Id<"documents"> | null>(null);
  const docs = useQuery(api.documents.listForEmployee, { employeeId });
  const deleteDoc = useMutation(api.documents.remove);
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteDoc({ documentId: deleteTarget }); toast.success("Document deleted"); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to delete document"); }
    setDeleteTarget(null);
  };
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" />Documents{docs !== undefined && docs.length > 0 && <Badge variant="secondary">{docs.length}</Badge>}</CardTitle>
            {canManage && <Button size="sm" onClick={() => setUploadOpen(true)} className="cursor-pointer"><Upload className="size-4" />Upload</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {docs === undefined ? (
            <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : docs.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><FileText /></EmptyMedia><EmptyTitle>No documents yet</EmptyTitle><EmptyDescription>Upload contracts, IDs, certificates and more.</EmptyDescription></EmptyHeader>{canManage && <EmptyContent><Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="size-4" /> Upload Document</Button></EmptyContent>}</Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {docs.map((doc) => {
                const icon = fileIcon(doc.contentType);
                return (
                  <div key={doc._id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-3 py-2.5 sm:flex-nowrap">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-lg">{icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium">{doc.fileName}</span>{doc.isConfidential && <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300"><Lock className="size-3" /> Confidential</Badge>}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className={`inline-flex rounded-full px-1.5 py-0.5 font-medium ${CATEGORY_COLORS[doc.category] ?? "bg-muted text-muted-foreground"}`}>{CATEGORY_LABELS[doc.category] ?? doc.category}</span>{doc.fileSize !== null && <span>{formatFileSize(doc.fileSize)}</span>}<span>{format(new Date(doc._creationTime), "MMM d, yyyy")}</span>{doc.uploaderName && <span>by {doc.uploaderName}</span>}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {doc.fileUrl ? (<><a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Button size="icon" variant="ghost" className="size-8 cursor-pointer" title="Preview"><Eye className="size-3.5" /></Button></a><a href={doc.fileUrl} download={doc.fileName}><Button size="icon" variant="ghost" className="size-8 cursor-pointer" title="Download"><Download className="size-3.5" /></Button></a></>) : <Badge variant="outline" className="text-xs text-muted-foreground">Restricted</Badge>}
                      {canManage && <Button size="icon" variant="ghost" className="size-8 cursor-pointer text-destructive hover:text-destructive" onClick={() => setDeleteTarget(doc._id)} title="Delete"><Trash2 className="size-3.5" /></Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {canManage && <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} preselectedEmployeeId={employeeId} isManager={canManage} />}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Document?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the file and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

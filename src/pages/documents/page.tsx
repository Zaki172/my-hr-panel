import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated } from "convex/react";
import { format } from "date-fns";
import { Upload, Download, Trash2, FileText, Lock, Eye, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { UploadDocumentDialog } from "./_components/upload-document-dialog.tsx";
import { CATEGORY_LABELS, CATEGORY_COLORS, type Document, formatFileSize, fileIcon } from "./_components/doc-utils.ts";

const ALL = "all";

export default function Documents() {
  return <Authenticated><DocumentsContent /></Authenticated>;
}

function DocumentsContent() {
  const { selectedCompanyId } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const isManager = me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager";
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Id<"documents"> | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const allDocs = useQuery(api.documents.listForCompany, isManager ? { companyId: selectedCompanyId } : "skip") as Document[] | undefined;
  const myDocs = useQuery(api.documents.getMyDocuments, !isManager ? {} : "skip") as Document[] | undefined;
  const deleteDoc = useMutation(api.documents.remove);
  const rawDocs = isManager ? allDocs : myDocs;
  const docs = rawDocs?.filter((d) => { if (categoryFilter !== ALL && d.category !== categoryFilter) return false; if (search && !d.fileName.toLowerCase().includes(search.toLowerCase()) && !d.employeeName?.toLowerCase().includes(search.toLowerCase())) return false; return true; });
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteDoc({ documentId: deleteTarget }); toast.success("Document deleted"); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to delete document"); }
    setDeleteTarget(null);
  };
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-2xl font-bold tracking-tight">Documents</h1><p className="text-sm text-muted-foreground">{isManager ? "Manage team documents by category with access control." : "Your uploaded and shared documents."}</p></div>
        <Button onClick={() => setUploadOpen(true)}><Upload className="size-4" /> Upload Document</Button>
      </div>
      {rawDocs !== undefined && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><p className="text-2xl font-bold">{rawDocs.length}</p><p className="text-xs text-muted-foreground">Total Docs</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3"><Lock className="size-5 text-amber-500" /><div><p className="text-2xl font-bold">{rawDocs.filter((d) => d.isConfidential).length}</p><p className="text-xs text-muted-foreground">Confidential</p></div></CardContent></Card>
          {Object.entries(CATEGORY_LABELS).slice(0, 2).map(([key, label]) => (<Card key={key}><CardContent className="flex items-center gap-3"><span className="text-xl">{fileIcon(null)}</span><div><p className="text-2xl font-bold">{rawDocs.filter((d) => d.category === key).length}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>))}
        </div>
      )}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by filename or employee\u2026" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-52"><SelectValue placeholder="All Categories" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All Categories</SelectItem>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
        </CardContent>
      </Card>
      {docs === undefined ? (<div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>)
        : docs.length === 0 ? (<Empty><EmptyHeader><EmptyMedia variant="icon"><FileText /></EmptyMedia><EmptyTitle>No documents found</EmptyTitle><EmptyDescription>{search || categoryFilter !== ALL ? "Try adjusting your filters." : "Upload the first document to get started."}</EmptyDescription></EmptyHeader>{!search && categoryFilter === ALL && <EmptyContent><Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="size-4" /> Upload Document</Button></EmptyContent>}</Empty>)
        : (<div className="flex flex-col gap-2">{docs.map((doc) => <DocumentRow key={doc._id} doc={doc} isManager={isManager} onDelete={() => setDeleteTarget(doc._id)} />)}</div>)}
      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} companyId={selectedCompanyId} isManager={isManager} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Document?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the file. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocumentRow({ doc, isManager, onDelete }: { doc: Document; isManager: boolean; onDelete: () => void }) {
  const icon = fileIcon(doc.contentType);
  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">{icon}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2"><span className="truncate font-medium">{doc.fileName}</span>{doc.isConfidential && <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300"><Lock className="size-3" /> Confidential</Badge>}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${CATEGORY_COLORS[doc.category] ?? "bg-muted text-muted-foreground"}`}>{CATEGORY_LABELS[doc.category] ?? doc.category}</span>{doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}<span>{format(new Date(doc._creationTime), "MMM d, yyyy")}</span>{doc.uploaderName && <span>by {doc.uploaderName}</span>}</div>
        </div>
        {isManager && doc.employeeName && (<div className="hidden items-center gap-2 sm:flex"><Avatar className="size-7"><AvatarImage src={doc.employeePhoto ?? undefined} /><AvatarFallback className="text-xs">{doc.employeeName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="text-sm text-muted-foreground">{doc.employeeName}</span></div>)}
        <div className="flex shrink-0 items-center gap-1">
          {doc.fileUrl ? (<><a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Button size="icon" variant="ghost" title="Preview"><Eye className="size-4" /></Button></a><a href={doc.fileUrl} download={doc.fileName}><Button size="icon" variant="ghost" title="Download"><Download className="size-4" /></Button></a></>) : <Badge variant="outline" className="text-xs text-muted-foreground">Restricted</Badge>}
          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete} title="Delete"><Trash2 className="size-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

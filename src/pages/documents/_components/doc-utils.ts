import type { Id } from "@/convex/_generated/dataModel.d.ts";

export const CATEGORY_LABELS: Record<string, string> = {
  employment_contract: "Employment Contract", id_passport: "ID / Passport", cv_resume: "CV / Resume", certificate: "Certificate", salary_document: "Salary Document", company_document: "Company Document", training_document: "Training Document", other: "Other",
};

export const CATEGORY_COLORS: Record<string, string> = {
  employment_contract: "bg-purple-500/15 text-purple-700 dark:text-purple-300", id_passport: "bg-sky-500/15 text-sky-700 dark:text-sky-300", cv_resume: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", certificate: "bg-amber-500/15 text-amber-700 dark:text-amber-300", salary_document: "bg-red-500/15 text-red-700 dark:text-red-300", company_document: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300", training_document: "bg-teal-500/15 text-teal-700 dark:text-teal-300", other: "bg-muted text-muted-foreground",
};

export type Document = {
  _id: Id<"documents">; _creationTime: number; employeeId: Id<"employees">; companyId: Id<"companies">; category: string; fileName: string; fileId: Id<"_storage">; uploadedBy: Id<"employees">; isConfidential: boolean; fileUrl: string | null; fileSize: number | null; contentType: string | null; employeeName: string | null; employeePhoto: string | null; employeeCode: string | null; uploaderName: string | null;
};

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileIcon(contentType: string | null): string {
  if (!contentType) return "\u{1F4C4}";
  if (contentType.startsWith("image/")) return "\u{1F5BC}\uFE0F";
  if (contentType === "application/pdf") return "\u{1F4CB}";
  if (contentType.includes("word")) return "\u{1F4DD}";
  if (contentType.includes("excel") || contentType.includes("spreadsheet")) return "\u{1F4CA}";
  if (contentType.includes("zip") || contentType.includes("compressed")) return "\u{1F5DC}\uFE0F";
  return "\u{1F4C4}";
}

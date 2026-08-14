import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

type CompanyFilter = "all" | Id<"companies">;

type CompanyContextValue = {
  companies: Doc<"companies">[] | undefined;
  selected: CompanyFilter;
  setSelected: (value: CompanyFilter) => void;
  selectedCompanyId: Id<"companies"> | undefined;
  selectedCompany: Doc<"companies"> | undefined;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const companies = useQuery(api.companies.list, {});
  const [selected, setSelected] = useState<CompanyFilter>("all");

  const value = useMemo<CompanyContextValue>(() => {
    const selectedCompanyId = selected === "all" ? undefined : selected;
    const selectedCompany = companies?.find((c) => c._id === selectedCompanyId);
    return { companies, selected, setSelected, selectedCompanyId, selectedCompany };
  }, [companies, selected]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanyFilter() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompanyFilter must be used within a CompanyProvider");
  return ctx;
}

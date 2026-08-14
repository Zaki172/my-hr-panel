import { Construction } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Construction /></EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>This module is coming soon in a future milestone.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

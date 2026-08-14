import { UserPlus, CalendarCheck, ListPlus, FolderPlus, CalendarClock, Upload, Megaphone, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

const ACTIONS = [
  { label: "Add Employee", icon: <UserPlus className="size-4.5" /> },
  { label: "Mark Attendance", icon: <CalendarCheck className="size-4.5" /> },
  { label: "Create Task", icon: <ListPlus className="size-4.5" /> },
  { label: "Create Project", icon: <FolderPlus className="size-4.5" /> },
  { label: "Request Leave", icon: <CalendarClock className="size-4.5" /> },
  { label: "Upload Document", icon: <Upload className="size-4.5" /> },
  { label: "Create Announcement", icon: <Megaphone className="size-4.5" /> },
  { label: "View Reports", icon: <BarChart3 className="size-4.5" /> },
];

export function QuickActionsCard() {
  return (
    <Card>
      <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map((action) => (
          <button key={action.label} onClick={() => toast.info("Coming soon in a future milestone!")} className="flex cursor-pointer flex-col items-start gap-2 rounded-lg border bg-secondary/40 p-3 text-left transition-colors hover:bg-accent">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">{action.icon}</div>
            <span className="text-xs font-medium leading-tight">{action.label}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

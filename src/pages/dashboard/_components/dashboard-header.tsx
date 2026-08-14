import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { MapPin, CalendarDays } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader() {
  const { user } = useAuth();
  const me = useQuery(api.me.getMe, {});
  const firstName = (me?.employee?.fullName ?? user?.profile.name ?? "there").split(" ")[0];
  const today = new Date();
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{getGreeting()}, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">Here's what's happening across Nakamura Travels & Innovate IT Hub today.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-xl border bg-card px-3.5 py-2.5 text-sm shadow-sm">
        <CalendarDays className="size-4 text-primary" />
        <span className="font-medium">{today.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
        <span className="text-muted-foreground">|</span>
        <MapPin className="size-4 text-primary" />
        <span className="text-muted-foreground">{me?.employee?.officeLocation ?? "Tokyo, Japan"}</span>
      </div>
    </div>
  );
}

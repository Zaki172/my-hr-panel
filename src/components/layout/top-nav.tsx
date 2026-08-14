import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useQuery, useMutation, useConvexAuth } from "convex/react";
import { Bell, Search, ChevronDown, Building2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export function TopNav() {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-sm md:px-5">
      <SidebarTrigger />
      <CompanySwitcher />
      <SearchBar />
      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        <NotificationsMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}

function CompanySwitcher() {
  const { companies, selected, setSelected } = useCompanyFilter();
  const label = useMemo(() => { if (selected === "all") return "All Companies"; return companies?.find((c) => c._id === selected)?.name ?? "All Companies"; }, [selected, companies]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="hidden cursor-pointer items-center gap-2 rounded-full sm:flex">
          <Building2 className="size-4 text-primary" />
          <span className="max-w-32 truncate">{label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch company view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => setSelected("all")}>All Companies</DropdownMenuItem>
        {companies?.map((company) => (
          <DropdownMenuItem key={company._id} className="cursor-pointer" onClick={() => setSelected(company._id)}>{company.name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchBar() {
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const results = useQuery(api.search.quickSearch, term.trim().length >= 2 ? { term: term.trim() } : "skip");
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open && term.trim().length >= 2} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => { setTerm(e.target.value); setOpen(true); }} placeholder="Search people, tasks, documents…" className="rounded-full bg-muted pl-9 shadow-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
        {results === undefined ? (
          <div className="space-y-2 p-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
        ) : results.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No results found</p>
        ) : (
          <div className="flex flex-col gap-1">
            {results.map((result) => (
              <button key={`${result.type}-${result.id}`} className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => { navigate(result.path); setOpen(false); setTerm(""); }}>
                <span className="truncate">{result.label}</span>
                <Badge variant="secondary" className="ml-2 shrink-0 capitalize">{result.type}</Badge>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationsMenu() {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const notifications = useQuery(api.notifications.listMine, isAuthenticated ? {} : "skip");
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const handleClick = async (n: { _id: string; isRead: boolean; linkPath?: string }) => { if (!n.isRead) await markRead({ notificationId: n._id as Parameters<typeof markRead>[0]["notificationId"] }); if (n.linkPath) navigate(n.linkPath); };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer rounded-full">
          <Bell className="size-5" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && <button className="cursor-pointer text-xs text-primary hover:underline" onClick={() => void markAllRead({})}>Mark all read</button>}
        </div>
        <DropdownMenuSeparator />
        {notifications === undefined ? (
          <div className="space-y-2 p-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : notifications.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{"You're all caught up. No notifications yet."}</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-0.5 overflow-auto p-1">
            {notifications.slice(0, 10).map((n) => (
              <button key={n._id} className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent ${!n.isRead ? "bg-primary/8" : ""}`} onClick={() => void handleClick(n)}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                  {!n.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  return (
    <>
      <Authenticated><ProfileMenuInner /></Authenticated>
      <Unauthenticated><SignInButton size="sm" /></Unauthenticated>
      <AuthLoading><Skeleton className="size-9 rounded-full" /></AuthLoading>
    </>
  );
}

const ROLE_LABELS: Record<string, string> = { super_admin: "CEO / Super Admin", hr_manager: "HR Manager", manager: "Manager", employee: "Employee" };

function ProfileMenuInner() {
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const me = useQuery(api.me.getMe, {});
  const name = me?.employee?.fullName ?? user?.profile.name ?? "User";
  const roleLabel = ROLE_LABELS[me?.role ?? "employee"];
  const avatarUrl = me?.employee?.photoUrl ?? (typeof user?.profile.avatar === "string" ? user.profile.avatar : undefined);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex cursor-pointer items-center gap-2 rounded-full pr-1 pl-1 hover:bg-accent">
          <Avatar><AvatarImage src={avatarUrl} /><AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
          <div className="hidden flex-col items-start leading-tight md:flex">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
          <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {me?.employee && <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(`/employees/${me.employee?._id}`)}>My Profile</DropdownMenuItem>}
        <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => void signout()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

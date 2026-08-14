import { useCallback, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LayoutDashboard, Users, CalendarCheck, CalendarClock, KanbanSquare, CalendarRange, Building2, Award, FileText, Megaphone, BarChart3, Settings, Plane, Code2 } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarInset } from "@/components/ui/sidebar.tsx";
import { TopNav } from "./top-nav.tsx";
import { cn } from "@/lib/utils.ts";

type NavItem = { label: string; path: string; icon: ReactNode; comingSoon?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard /> },
  { label: "People / Employees", path: "/employees", icon: <Users /> },
  { label: "Attendance", path: "/attendance", icon: <CalendarCheck /> },
  { label: "Leave Management", path: "/leave", icon: <CalendarClock /> },
  { label: "Tasks & Projects", path: "/tasks", icon: <KanbanSquare /> },
  { label: "Team Schedule", path: "/schedule", icon: <CalendarRange /> },
  { label: "Departments", path: "/departments", icon: <Building2 /> },
  { label: "Performance", path: "/performance", icon: <Award /> },
  { label: "Documents", path: "/documents", icon: <FileText /> },
  { label: "Announcements", path: "/announcements", icon: <Megaphone /> },
  { label: "Reports & Analytics", path: "/reports", icon: <BarChart3 /> },
  { label: "Settings", path: "/settings", icon: <Settings /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNav />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const goComingSoon = useCallback((path: string) => { navigate(path); }, [navigate]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-0 px-3 py-4 group-data-[collapsible=icon]:px-2">
        <Link to="/" className="flex items-center gap-2.5 px-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-serif text-base font-bold text-sidebar-primary-foreground">N</div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">Nakamura {"\u00d7"} Innovate</span>
            <span className="text-[11px] text-sidebar-foreground/60">HR Hub</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={cn("h-10 cursor-pointer rounded-lg font-medium transition-colors", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground [&>svg]:text-sidebar-primary-foreground" : "text-sidebar-foreground/80")}>
                      <Link to={item.path} onClick={(e) => { if (item.comingSoon) { e.preventDefault(); toast.info("Coming soon in a future milestone!"); goComingSoon(location.pathname); } }}>
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="px-1 text-sidebar-foreground/50">Our Companies</SidebarGroupLabel>
        <div className="flex flex-col gap-2">
          <CompanyFooterCard icon={<Plane className="size-4" />} name="Nakamura Travels" description="Travel Agency" />
          <CompanyFooterCard icon={<Code2 className="size-4" />} name="Innovate IT Hub" description="IT & Digital Solutions" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function CompanyFooterCard({ icon, name, description }: { icon: ReactNode; name: string; description: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 px-2.5 py-2")}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/20 text-sidebar-primary">{icon}</div>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold text-sidebar-foreground">{name}</span>
        <span className="text-[11px] text-sidebar-foreground/55">{description}</span>
      </div>
    </div>
  );
}

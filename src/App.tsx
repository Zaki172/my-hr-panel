import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { CompanyProvider } from "./hooks/use-company-filter.tsx";
import { AppShell } from "./components/layout/app-shell.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import Employees from "./pages/employees/page.tsx";
import EmployeeProfile from "./pages/employees/[employeeId]/page.tsx";
import Departments from "./pages/departments/page.tsx";
import DepartmentDetail from "./pages/departments/[departmentId]/page.tsx";
import Attendance from "./pages/attendance/page.tsx";
import Leave from "./pages/leave/page.tsx";
import Tasks from "./pages/tasks/page.tsx";
import Schedule from "./pages/schedule/page.tsx";
import ProjectDetail from "./pages/tasks/[projectId]/page.tsx";
import Performance from "./pages/performance/page.tsx";
import Documents from "./pages/documents/page.tsx";
import Announcements from "./pages/announcements/page.tsx";
import Reports from "./pages/reports/page.tsx";
import Settings from "./pages/settings/page.tsx";
import ComingSoon from "./pages/ComingSoon.tsx";
import NotFound from "./pages/NotFound.tsx";

function AppLayout() {
  return (
    <CompanyProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </CompanyProvider>
  );
}

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:employeeId" element={<EmployeeProfile />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:projectId" element={<ProjectDetail />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/departments/:departmentId" element={<DepartmentDetail />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}

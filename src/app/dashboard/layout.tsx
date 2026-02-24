import { AppSidebar } from "@/components/layout/sidebar";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { TaskNotificationPopup } from "@/components/features/TaskNotificationPopup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="icon">
          <AppSidebar />
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
            <SidebarTrigger />
          </header>
          {children}
          <TaskNotificationPopup />
        </SidebarInset>
      </SidebarProvider>
    </SettingsProvider>
  );
}

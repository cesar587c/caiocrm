'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppSidebar } from "@/components/layout/sidebar";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { TaskNotificationPopup } from "@/components/features/TaskNotificationPopup";

const ProtectedContent = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoaded, currentUser, rolePermissions } = useSettings();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.replace('/login');
    } else if (isLoaded && isAuthenticated && currentUser) {
        const allowedPaths = rolePermissions[currentUser.role] || ['/dashboard'];
        const isAllowed = allowedPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
        
        if (!isAllowed) {
            router.replace('/dashboard');
        }
    }
  }, [isAuthenticated, isLoaded, router, currentUser, pathname, rolePermissions]);

  if (!isLoaded || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
  );
};


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <ProtectedContent>{children}</ProtectedContent>
    </SettingsProvider>
  );
}

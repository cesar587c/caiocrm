'use client';

import React, { useEffect, useMemo } from 'react';
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

const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: ['/dashboard', '/dashboard/clientes', '/dashboard/funil-vendas', '/dashboard/propostas', '/dashboard/agenda', '/dashboard/chamados', '/dashboard/relatorios', '/dashboard/configuracoes', '/dashboard/usuarios'],
    technician: ['/dashboard', '/dashboard/clientes', '/dashboard/agenda', '/dashboard/chamados'],
    finance: ['/dashboard', '/dashboard/clientes', '/dashboard/funil-vendas', '/dashboard/propostas', '/dashboard/relatorios'],
    service: ['/dashboard', '/dashboard/clientes', '/dashboard/agenda', '/dashboard/chamados'],
};

const ProtectedContent = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoaded, currentUser } = useSettings();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.replace('/login');
    } else if (isLoaded && isAuthenticated && currentUser) {
        const allowedPaths = ROLE_PERMISSIONS[currentUser.role] || ['/dashboard'];
        const isAllowed = allowedPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
        
        if (!isAllowed) {
            router.replace('/dashboard');
        }
    }
  }, [isAuthenticated, isLoaded, router, currentUser, pathname]);

  const content = useMemo(() => {
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
  }, [isLoaded, isAuthenticated, children]);

  return content;
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

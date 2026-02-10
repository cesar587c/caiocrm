"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Filter,
  FileText,
  Calendar,
  BookUser,
  LineChart,
  UserCog,
  LogOut,
  ChevronDown,
  BrainCircuit,
  View,
  Settings,
} from "lucide-react";
import { Button } from "../ui/button";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/funil-vendas", label: "Funil de Vendas", icon: Filter },
  { href: "/dashboard/propostas", label: "Propostas", icon: FileText },
  { href: "/dashboard/agenda", label: "Agenda", icon: Calendar },
  { href: "/dashboard/chamados", label: "Chamados", icon: BookUser },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: LineChart },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  { href: "/dashboard/usuarios", label: "Usuários", icon: UserCog },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { iconSize, setIconSize } = useSidebar();

  return (
    <>
      <SidebarHeader className="group-data-[state=expanded]:px-2">
        <div className="flex items-center gap-2 group-data-[state=collapsed]:justify-center">
           <BrainCircuit className="h-8 w-8 text-primary-foreground" />
           <h1 className="font-headline text-2xl font-semibold text-primary-foreground group-data-[state=collapsed]:hidden">VendasPro</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  size={iconSize === 'large' ? 'lg' : 'default'}
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-start gap-2 p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]:justify-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://picsum.photos/seed/user/40/40" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left group-data-[state=collapsed]:hidden">
                <p className="text-sm font-medium">Admin</p>
                <p className="text-xs text-sidebar-foreground/70">
                  admin@vendaspro.com
                </p>
              </div>
              <ChevronDown className="h-4 w-4 group-data-[state=collapsed]:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Admin</p>
                <p className="text-xs leading-none text-muted-foreground">
                  admin@vendaspro.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCog className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>

            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <View className="mr-2 h-4 w-4" />
                    <span>Visualização</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                            value={iconSize}
                            onValueChange={(value) => setIconSize(value as "default" | "large")}
                        >
                            <DropdownMenuLabel>Tamanho dos Ícones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioItem value="default">Pequeno</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="large">Grande</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
}

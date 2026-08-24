import {
    LayoutDashboard, Users, Filter, FileText, Calendar, BookUser, LineChart,
    UserCog, BookOpen, Settings,
} from 'lucide-vue-next';

export const MENU_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
    { href: '/dashboard/funil-vendas', label: 'Funil de Vendas', icon: Filter },
    { href: '/dashboard/propostas', label: 'Propostas', icon: FileText },
    { href: '/dashboard/agenda', label: 'Agenda', icon: Calendar },
    { href: '/dashboard/chamados', label: 'Ordens de Serviço', icon: BookUser },
    { href: '/dashboard/relatorios', label: 'Relatórios', icon: LineChart },
    { href: '/dashboard/manual', label: 'Manual do Usuário', icon: BookOpen },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/dashboard/usuarios', label: 'Usuários', icon: UserCog },
];

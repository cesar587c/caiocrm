<script setup>
import { computed, ref } from 'vue';
import { Link, router, usePage } from '@inertiajs/vue3';
import { LogOut, ChevronDown, BrainCircuit, X, Menu } from 'lucide-vue-next';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Button } from '@/Components/ui/button';
import { MENU_ITEMS } from '@/lib/menu';

const roleLabels = { admin: 'Administrador', technician: 'Técnico', finance: 'Financeiro', service: 'Atendimento' };

const page = usePage();
const currentUser = computed(() => page.props.auth.user);
const rolePermissions = computed(() => page.props.rolePermissions ?? {});
const collapsed = ref(false);
const mobileOpen = ref(false);

const allowedMenuItems = computed(() => {
    if (!currentUser.value) return [];
    const allowedPaths = rolePermissions.value[currentUser.value.role] ?? ['/dashboard'];
    return MENU_ITEMS.filter((item) => allowedPaths.includes(item.href));
});

function isActive(href) {
    return page.url === href || page.url.startsWith(href + '?');
}

function logout() {
    router.post('/logout');
}
</script>

<template>
    <div class="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Button variant="ghost" size="icon" @click="mobileOpen = !mobileOpen">
            <Menu class="h-5 w-5" />
        </Button>
        <span class="font-headline font-semibold">VendasPro</span>
    </div>

    <div
        v-if="mobileOpen"
        class="fixed inset-0 z-40 bg-black/60 md:hidden"
        @click="mobileOpen = false"
    />

    <aside
        :class="[
            'flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0 transition-all duration-200',
            'fixed inset-y-0 left-0 z-50 md:static',
            collapsed ? 'w-16' : 'w-64',
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ]"
    >
        <div class="flex items-center gap-2 px-4 h-16 shrink-0" :class="collapsed && 'justify-center px-2'">
            <BrainCircuit class="h-8 w-8 shrink-0" />
            <h1 v-if="!collapsed" class="font-headline text-2xl font-semibold truncate">VendasPro</h1>
            <Button variant="ghost" size="icon" class="ml-auto hidden md:inline-flex text-sidebar-foreground hover:bg-sidebar-accent" @click="collapsed = !collapsed">
                <Menu class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="ml-auto md:hidden text-sidebar-foreground hover:bg-sidebar-accent" @click="mobileOpen = false">
                <X class="h-4 w-4" />
            </Button>
        </div>

        <nav class="flex-1 overflow-y-auto px-2 space-y-1">
            <Link
                v-for="item in allowedMenuItems"
                :key="item.href"
                :href="item.href"
                :class="[
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/90',
                    collapsed && 'justify-center px-2',
                ]"
                :title="item.label"
                @click="mobileOpen = false"
            >
                <component :is="item.icon" class="h-4 w-4 shrink-0" />
                <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            </Link>
        </nav>

        <div class="border-t border-sidebar-border p-2 space-y-1">
            <button
                type="button"
                :class="['flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed && 'justify-center px-2']"
                @click="logout"
            >
                <LogOut class="h-4 w-4 shrink-0" />
                <span v-if="!collapsed">Sair</span>
            </button>

            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button variant="ghost" :class="['h-auto w-full justify-start gap-2 p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed && 'justify-center']">
                        <Avatar class="h-8 w-8">
                            <AvatarImage :src="`https://picsum.photos/seed/${currentUser?.id || 'default'}/40/40`" :alt="currentUser?.name" />
                            <AvatarFallback>{{ currentUser?.name?.charAt(0) || 'U' }}</AvatarFallback>
                        </Avatar>
                        <div v-if="!collapsed" class="flex-1 text-left overflow-hidden">
                            <p class="text-sm font-medium truncate">{{ currentUser?.name || 'Usuário' }}</p>
                            <p class="text-xs text-sidebar-foreground/70 truncate">{{ currentUser?.email || 'N/A' }}</p>
                        </div>
                        <ChevronDown v-if="!collapsed" class="h-4 w-4 shrink-0" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-56" align="end">
                    <DropdownMenuLabel class="font-normal">
                        <div class="flex flex-col space-y-1">
                            <p class="text-sm font-medium leading-none">{{ currentUser?.name }}</p>
                            <p class="text-xs leading-none text-muted-foreground">{{ roleLabels[currentUser?.role] }}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem as-child>
                        <button type="button" class="w-full text-left" @click="logout">Sair</button>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </aside>
</template>

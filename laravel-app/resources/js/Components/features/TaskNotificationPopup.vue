<script setup>
import { computed, ref, watch } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { AlertTriangle, CalendarCheck, Clock } from 'lucide-vue-next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { ScrollArea } from '@/Components/ui/scroll-area';

const page = usePage();
const currentUser = computed(() => page.props.auth.user);
const notifications = computed(() => page.props.notifications ?? []);

const open = ref(false);
const shownForUserId = ref(null);

watch(
    () => [currentUser.value?.id, notifications.value],
    () => {
        if (!currentUser.value || currentUser.value.id === shownForUserId.value) return;
        if (notifications.value.length > 0) {
            open.value = true;
        }
        shownForUserId.value = currentUser.value.id;
    },
    { immediate: true, deep: true },
);
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-2">
                    <AlertTriangle class="h-5 w-5 text-yellow-500" />
                    Agenda e Alertas do Dia
                </DialogTitle>
                <DialogDescription>
                    Olá, {{ currentUser?.name }}! Você tem compromissos marcados para hoje.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea class="max-h-[50vh] pr-4">
                <div class="space-y-3 py-2">
                    <div v-for="(n, idx) in notifications" :key="idx" class="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                        <Clock v-if="n.type === 'overdue_os'" class="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <CalendarCheck v-else class="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div class="text-sm">
                            <p>{{ n.message }}</p>
                            <p v-if="n.customerName" class="text-xs text-muted-foreground">{{ n.customerName }}</p>
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" @click="open = false">Fechar Alertas</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

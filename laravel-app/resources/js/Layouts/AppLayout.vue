<script setup>
import { watch } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { Toaster, toast } from 'vue-sonner';
import AppSidebar from './AppSidebar.vue';
import TaskNotificationPopup from '@/Components/features/TaskNotificationPopup.vue';

const page = usePage();

watch(
    () => page.props.flash,
    (flash) => {
        if (flash?.success) toast(flash.success);
        if (flash?.error) toast.error(flash.error);
    },
    { immediate: true, deep: true },
);
</script>

<template>
    <div class="flex h-screen w-full flex-col overflow-hidden bg-background md:flex-row">
        <AppSidebar />
        <div class="flex flex-1 flex-col min-w-0 overflow-hidden">
            <main class="flex-1 overflow-y-auto">
                <slot />
            </main>
        </div>
        <TaskNotificationPopup />
        <Toaster theme="dark" richColors position="top-right" />
    </div>
</template>

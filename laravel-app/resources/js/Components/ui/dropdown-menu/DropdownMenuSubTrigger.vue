<script setup>
import { DropdownMenuSubTrigger } from 'reka-ui';
import { ChevronRight } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <DropdownMenuSubTrigger
        :class="cn(
            'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent',
            $props.class,
        )"
    >
        <slot />
        <ChevronRight class="ml-auto h-4 w-4" />
    </DropdownMenuSubTrigger>
</template>

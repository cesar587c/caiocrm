<script setup>
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui';
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <ScrollAreaRoot :class="cn('relative overflow-hidden', $props.class)">
        <ScrollAreaViewport class="h-full w-full rounded-[inherit]">
            <slot />
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="vertical" class="flex touch-none select-none transition-colors w-2.5 border-l border-l-transparent p-[1px]">
            <ScrollAreaThumb class="relative flex-1 rounded-full bg-border" />
        </ScrollAreaScrollbar>
        <ScrollAreaScrollbar orientation="horizontal" class="flex touch-none select-none transition-colors h-2.5 flex-col border-t border-t-transparent p-[1px]">
            <ScrollAreaThumb class="relative flex-1 rounded-full bg-border" />
        </ScrollAreaScrollbar>
        <ScrollAreaCorner />
    </ScrollAreaRoot>
</template>

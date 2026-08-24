<script setup>
import { SelectContent, SelectPortal, SelectScrollDownButton, SelectScrollUpButton, SelectViewport } from 'reka-ui';
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <SelectPortal>
        <SelectContent
            position="popper"
            :class="cn(
                'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
                'w-[--reka-select-trigger-width]',
                $props.class,
            )"
        >
            <SelectScrollUpButton />
            <SelectViewport class="p-1">
                <slot />
            </SelectViewport>
            <SelectScrollDownButton />
        </SelectContent>
    </SelectPortal>
</template>

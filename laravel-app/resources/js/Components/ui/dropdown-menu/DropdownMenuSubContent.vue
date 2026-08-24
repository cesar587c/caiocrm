<script setup>
import { DropdownMenuPortal, DropdownMenuSubContent } from 'reka-ui';
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <DropdownMenuPortal>
        <DropdownMenuSubContent
            :class="cn(
                'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                $props.class,
            )"
        >
            <slot />
        </DropdownMenuSubContent>
    </DropdownMenuPortal>
</template>

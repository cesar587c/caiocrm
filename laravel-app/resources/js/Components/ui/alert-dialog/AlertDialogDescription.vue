<script setup>
import { AlertDialogDescription } from 'reka-ui';
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <AlertDialogDescription :class="cn('text-sm text-muted-foreground', $props.class)">
        <slot />
    </AlertDialogDescription>
</template>

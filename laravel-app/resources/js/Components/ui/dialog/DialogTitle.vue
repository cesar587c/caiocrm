<script setup>
import { DialogTitle } from 'reka-ui';
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <DialogTitle :class="cn('text-lg font-semibold leading-none tracking-tight font-headline', $props.class)">
        <slot />
    </DialogTitle>
</template>

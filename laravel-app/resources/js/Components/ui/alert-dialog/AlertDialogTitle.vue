<script setup>
import { AlertDialogTitle } from 'reka-ui';
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <AlertDialogTitle :class="cn('text-lg font-semibold font-headline', $props.class)">
        <slot />
    </AlertDialogTitle>
</template>

<script setup>
import { AlertDialogCancel } from 'reka-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/Components/ui/button/variants';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <AlertDialogCancel :class="cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', $props.class)">
        <slot />
    </AlertDialogCancel>
</template>

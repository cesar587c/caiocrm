<script setup>
import { AlertDialogAction } from 'reka-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/Components/ui/button/variants';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <AlertDialogAction :class="cn(buttonVariants({ variant: 'default' }), $props.class)">
        <slot />
    </AlertDialogAction>
</template>

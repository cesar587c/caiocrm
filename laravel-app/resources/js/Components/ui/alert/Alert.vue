<script setup>
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4', {
    variants: {
        variant: {
            default: 'bg-background text-foreground',
            destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        },
    },
    defaultVariants: { variant: 'default' },
});

const props = defineProps({ variant: { type: String, default: 'default' }, class: { type: null, default: undefined } });
</script>

<template>
    <div role="alert" :class="cn(alertVariants({ variant: props.variant }), props.class)">
        <slot />
    </div>
</template>

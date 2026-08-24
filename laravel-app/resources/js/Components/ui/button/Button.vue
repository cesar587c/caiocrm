<script setup>
import { cn } from '@/lib/utils';
import { buttonVariants } from './variants';

const props = defineProps({
    variant: { type: String, default: 'default' },
    size: { type: String, default: 'default' },
    as: { type: String, default: 'button' },
    class: { type: null, default: undefined },
});
</script>

<template>
    <component :is="as" :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)">
        <slot />
    </component>
</template>

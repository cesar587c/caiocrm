<script setup>
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <div :class="cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', $props.class)">
        <slot />
    </div>
</template>

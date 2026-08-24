<script setup>
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <div :class="cn('flex flex-col space-y-2 text-center sm:text-left', $props.class)">
        <slot />
    </div>
</template>

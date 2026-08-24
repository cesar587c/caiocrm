<script setup>
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <thead :class="cn('[&_tr]:border-b', $props.class)">
        <slot />
    </thead>
</template>

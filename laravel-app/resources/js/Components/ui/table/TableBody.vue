<script setup>
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <tbody :class="cn('[&_tr:last-child]:border-0', $props.class)">
        <slot />
    </tbody>
</template>

<script setup>
import { cn } from '@/lib/utils';
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <div class="relative w-full overflow-auto">
        <table :class="cn('w-full caption-bottom text-sm', $props.class)">
            <slot />
        </table>
    </div>
</template>

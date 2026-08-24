<script setup>
import { cn } from '@/lib/utils';

defineProps({ class: { type: null, default: undefined } });
const model = defineModel({ type: String, default: '' });
</script>

<template>
    <textarea
        v-model="model"
        :class="cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            $props.class,
        )"
    />
</template>

<script setup>
import { RadioGroupRoot } from 'reka-ui';
import { cn } from '@/lib/utils';

const model = defineModel({ type: String, default: undefined });
defineProps({ class: { type: null, default: undefined } });
</script>

<template>
    <RadioGroupRoot v-model="model" :class="cn('grid gap-2', $props.class)">
        <slot />
    </RadioGroupRoot>
</template>

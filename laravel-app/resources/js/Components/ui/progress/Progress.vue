<script setup>
import { ProgressRoot, ProgressIndicator } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
    modelValue: { type: Number, default: 0 },
    class: { type: null, default: undefined },
});
</script>

<template>
    <ProgressRoot :model-value="props.modelValue" :class="cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', props.class)">
        <ProgressIndicator
            class="h-full w-full flex-1 bg-primary transition-all"
            :style="`transform: translateX(-${100 - (props.modelValue || 0)}%)`"
        />
    </ProgressRoot>
</template>

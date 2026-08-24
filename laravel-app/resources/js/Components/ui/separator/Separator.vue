<script setup>
import { Separator } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
    orientation: { type: String, default: 'horizontal' },
    class: { type: null, default: undefined },
});
</script>

<template>
    <Separator
        :orientation="props.orientation"
        :class="cn('shrink-0 bg-border', props.orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]', props.class)"
    />
</template>

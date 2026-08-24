<script setup>
import { RadioGroupIndicator, RadioGroupItem } from 'reka-ui';
import { Circle } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
defineProps({ value: { type: String, required: true }, id: { type: String, default: undefined }, class: { type: null, default: undefined } });
</script>

<template>
    <RadioGroupItem
        :value="value"
        :id="id"
        :class="cn(
            'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center',
            $props.class,
        )"
    >
        <RadioGroupIndicator class="flex items-center justify-center">
            <Circle class="h-2.5 w-2.5 fill-current text-current" />
        </RadioGroupIndicator>
    </RadioGroupItem>
</template>

<script setup>
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui';
import { Check } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const checked = defineModel('checked', { type: [Boolean, String], default: false });
defineProps({ class: { type: null, default: undefined }, disabled: { type: Boolean, default: false } });
</script>

<template>
    <CheckboxRoot
        v-model:checked="checked"
        :disabled="disabled"
        :class="cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex items-center justify-center',
            $props.class,
        )"
    >
        <CheckboxIndicator class="flex items-center justify-center text-current">
            <Check class="h-3.5 w-3.5" />
        </CheckboxIndicator>
    </CheckboxRoot>
</template>

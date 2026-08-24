<script setup>
import { SelectRoot } from 'reka-ui';

const model = defineModel({ type: [String, Number], default: undefined });
defineProps({ disabled: { type: Boolean, default: false } });
const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <SelectRoot :model-value="model" :disabled="disabled" @update:model-value="(v) => emit('update:modelValue', v)">
        <slot />
    </SelectRoot>
</template>

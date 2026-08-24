<script setup>
import { PopoverRoot } from 'reka-ui';

const open = defineModel('open', { type: Boolean, default: undefined });
defineProps({ modal: { type: Boolean, default: undefined } });
</script>

<template>
    <PopoverRoot v-model:open="open" :modal="modal">
        <slot />
    </PopoverRoot>
</template>

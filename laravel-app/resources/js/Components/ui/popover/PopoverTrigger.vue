<script setup>
import { PopoverTrigger } from 'reka-ui';
defineProps({ asChild: { type: Boolean, default: false }, disabled: { type: Boolean, default: false } });
</script>

<template>
    <PopoverTrigger :as-child="asChild" :disabled="disabled">
        <slot />
    </PopoverTrigger>
</template>

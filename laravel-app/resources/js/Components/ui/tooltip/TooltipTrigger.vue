<script setup>
import { TooltipTrigger } from 'reka-ui';
defineProps({ asChild: { type: Boolean, default: false } });
</script>

<template>
    <TooltipTrigger :as-child="asChild">
        <slot />
    </TooltipTrigger>
</template>

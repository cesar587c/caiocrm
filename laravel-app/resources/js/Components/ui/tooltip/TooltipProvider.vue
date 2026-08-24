<script setup>
import { TooltipProvider } from 'reka-ui';
</script>

<template>
    <TooltipProvider :delay-duration="200">
        <slot />
    </TooltipProvider>
</template>

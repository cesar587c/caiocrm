<script setup>
import { AvatarFallback } from 'reka-ui';
</script>

<template>
    <AvatarFallback class="flex h-full w-full items-center justify-center rounded-full bg-muted">
        <slot />
    </AvatarFallback>
</template>

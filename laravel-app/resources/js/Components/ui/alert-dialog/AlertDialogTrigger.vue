<script setup>
import { AlertDialogTrigger } from 'reka-ui';
defineProps({ asChild: { type: Boolean, default: false } });
</script>

<template>
    <AlertDialogTrigger :as-child="asChild">
        <slot />
    </AlertDialogTrigger>
</template>

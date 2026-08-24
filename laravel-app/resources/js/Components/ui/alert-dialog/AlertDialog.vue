<script setup>
import { AlertDialogRoot } from 'reka-ui';

const open = defineModel('open', { type: Boolean, default: undefined });
</script>

<template>
    <AlertDialogRoot v-model:open="open">
        <slot />
    </AlertDialogRoot>
</template>

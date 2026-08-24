<script setup>
import { AvatarImage } from 'reka-ui';
defineProps({ src: { type: String, default: undefined }, alt: { type: String, default: '' } });
</script>

<template>
    <AvatarImage :src="src" :alt="alt" class="aspect-square h-full w-full object-cover" />
</template>

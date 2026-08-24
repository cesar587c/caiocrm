<script setup>
import { DropdownMenuRadioGroup } from 'reka-ui';

const model = defineModel({ type: String, default: undefined });
</script>

<template>
    <DropdownMenuRadioGroup v-model="model">
        <slot />
    </DropdownMenuRadioGroup>
</template>

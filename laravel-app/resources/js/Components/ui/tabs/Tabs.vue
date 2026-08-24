<script setup>
import { TabsRoot } from 'reka-ui';

const model = defineModel({ type: String, default: undefined });
defineProps({ defaultValue: { type: String, default: undefined } });
</script>

<template>
    <TabsRoot v-model="model" :default-value="defaultValue">
        <slot />
    </TabsRoot>
</template>

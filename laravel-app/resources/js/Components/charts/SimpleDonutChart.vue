<script setup>
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps({
    labels: { type: Array, required: true },
    values: { type: Array, required: true },
    colors: { type: Array, default: () => ['#8b6fd6', '#4b5563'] },
});

const data = computed(() => ({
    labels: props.labels,
    datasets: [
        {
            data: props.values,
            backgroundColor: props.colors,
            borderWidth: 0,
        },
    ],
}));

const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa' } } },
};
</script>

<template>
    <Doughnut :data="data" :options="options" />
</template>

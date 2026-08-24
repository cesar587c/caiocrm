<script setup>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps({
    labels: { type: Array, required: true },
    values: { type: Array, required: true },
    colors: { type: Array, default: () => ['#8b6fd6'] },
    horizontal: { type: Boolean, default: false },
});

const data = computed(() => ({
    labels: props.labels,
    datasets: [
        {
            data: props.values,
            backgroundColor: props.labels.map((_, i) => props.colors[i % props.colors.length]),
            borderRadius: 4,
        },
    ],
}));

const options = computed(() => ({
    indexAxis: props.horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        x: { grid: { display: false }, ticks: { color: '#a1a1aa' } },
        y: { grid: { display: false }, ticks: { color: '#a1a1aa' } },
    },
}));
</script>

<template>
    <Bar :data="data" :options="options" />
</template>

<script setup lang="ts">
	import { validate } from 'maplibre-gl';

	export let label: string | null = null;
	export let value: number;
	export let min: number = 0;
	export let max: number = 1;
	export let step: number = 0.01;

	let data = {
		type: 'match',
		property: '林齢',
		values: {
			mapping: {
				0: '#f8d5cc',
				60: '#6e40e6'
			},
			default: '#00000000',
			showIndex: [0, 1]
		}
	};
	let data2 = {
		type: 'interpolate',
		property: '林齢',
		values: {
			mapping: {
				keys: [0, 60, 90, 120],
				colors: ['#f8d5cc', '#6e40e6']
			},
			default: '#00000000',
			showIndex: [0, 1]
		}
	};

	$: console.log(data2.values);

	let data3 = {
		type: 'interpolate',
		property: '林齢',
		values: {
			mapping: {
				min: [0, 30],
				max: [30, 60],
				color: ['#f8d5cc', '#6e40e6']
			},
			default: '#00000000',
			showIndex: [0, 1]
		}
	};
</script>

{#each data2.values.mapping.value as value, i}
	<div class="flex w-full items-center">
		<div class="w-full text-sm">{value}</div>
		<input type="checkbox" bind:group={data2.values.showIndex} value={i} />
		<input type="color" class="custom-color" bind:value={data2.values.mapping.color[i]} />
		<input type="range" class="custom-slider" bind:value={data2.values.mapping.value[i]} />
	</div>
{/each}

{#each data3.values.mapping.min as value, i}
	<div class="flex w-full items-center">
		<div class="w-full text-sm">{value}</div>
		<input type="checkbox" bind:group={data3.values.showIndex} value={i} />
		<input type="color" class="custom-color" bind:value={data3.values.mapping.color[i]} />
		<input type="number" class="custom-number" bind:value={data3.values.mapping.min[i]} />
		<input type="number" class="custom-number" bind:value={data3.values.mapping.max[i]} />
	</div>
{/each}

<div class="flex flex-col gap-2">
	<label class="">{label}</label>
	<input type="range" class="custom-slider" bind:value {min} {max} {step} />
</div>

<style>
	.custom-number {
		width: 50px;
		height: 30px;
		padding: 5px;
		border: 1px solid #ccc;
		border-radius: 5px;
		font-size: 14px;
		color: #000;
	}
</style>

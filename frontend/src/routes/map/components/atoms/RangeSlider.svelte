<script lang="ts">
	import Icon from '@iconify/svelte';
	interface Props {
		label?: string;
		value: number;
		min: number;
		max: number;
		step: number;
		icon?: string;
	}
	let { label, value = $bindable(), min = 0, max = 1, step = 0.01, icon }: Props = $props();

	// TODO: animation
	let rangeElement = $state<HTMLDivElement | null>(null);
</script>

<div class="flex flex-col gap-4 pb-4 text-base">
	<div class="flex w-full items-center gap-1">
		{#if icon}
			<Icon {icon} width={20} />
		{/if}
		<div class="flex w-full select-none justify-between pr-2">
			<span>{label ? `${label}: ` : ''}</span><span>{value.toFixed(2)}</span>
		</div>
	</div>

	<input class="css-range" type="range" bind:value {min} {max} {step} />
</div>

<style>
	/* スライダー */
	.css-range {
		-webkit-appearance: none;
		appearance: none;
		outline: none;
		cursor: pointer;
		width: 95%;
		height: 3px;
	}

	/* スライダー バー */
	.css-range::-webkit-slider-runnable-track {
		background: rgb(201, 201, 201);
		height: 8px;
		border-radius: 8px;
	}

	/* スライダー つまみ */
	.css-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		height: 25px;
		width: 25px;
		margin-top: -9px; /* 位置の調整が必要 */
		background-color: #ffffff;
		border-radius: 50%;
		border: 3px solid rgb(0, 0, 0);
		transition: all 0.15s;
	}
	.css-range::-webkit-slider-thumb:hover {
		background-color: #ffffff;
		border: 3px solid var(--color-accent);
	}
</style>

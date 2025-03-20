<script lang="ts">
	let {
		label,
		value = $bindable(),
		min = 0,
		max = 1,
		step = 0.01
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step: number;
	} = $props();

	// TODO: animation
	let rangeElement = $state<HTMLDivElement | null>(null);
</script>

<div class="flex flex-col gap-2 pb-4">
	<span class="select-none">{label}: {value.toFixed(2)}</span>
	<input class="css-range" type="range" bind:value {min} {max} {step} />

	<!-- <div bind:this={rangeElement}>{1900000}</div> -->
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
		background: rgb(1, 44, 7);

		height: 8px;
		border-radius: 8px;
	}

	/* スライダー つまみ */
	.css-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		height: 18px;
		width: 18px;
		margin-top: -5px; /* 位置の調整が必要 */
		background-color: #ffffff;
		border-radius: 50%;
		border: 3px solid rgb(0, 0, 0);
		transition: all 0.15s;
	}
	.css-range::-webkit-slider-thumb:hover {
		background-color: #ffffff;
		border: 3px solid #47d400;
	}
</style>

<script lang="ts">
	import Icon from '@iconify/svelte';
	interface Props {
		label?: string;
		value: number;
		min: number;
		max: number;
		step: number;
		icon?: string;
		isInt?: boolean;
		showValue?: boolean;
		disabled?: boolean;
		onInput?: (value: number) => void;
	}
	let {
		label,
		value = $bindable(),
		min = 0,
		max = 1,
		step = 0.01,
		icon,
		isInt = false,
		showValue = true,
		disabled = false,
		onInput
	}: Props = $props();

	let progressPercent = $derived.by(() => {
		if (max <= min) return 0;
		const clampedValue = Math.min(Math.max(value, min), max);
		return ((clampedValue - min) / (max - min)) * 100;
	});

	const handleInput = () => {
		onInput?.(value);
	};
</script>

<div class="flex flex-col gap-3 pb-4 text-base">
	<div class="flex w-full items-center gap-1">
		{#if icon}
			<Icon {icon} width={20} />
		{/if}
		<div class="flex w-full justify-between pr-2 select-none">
			<span>{label ? `${label}: ` : ''}</span>{#if showValue}<span class={isInt ? 'pr-2' : ''}
					>{isInt ? value.toFixed(0) : value.toFixed(2)}</span
				>{/if}
		</div>
	</div>

	<input
		class="css-range"
		type="range"
		bind:value
		{min}
		{max}
		{step}
		{disabled}
		oninput={handleInput}
		style="background: linear-gradient(to right, var(--color-main-accent) 0%, var(--color-accent) {progressPercent}%, var(--color-sub) {progressPercent}%, var(--color-sub) 100%);"
	/>
</div>

<style>
	/* スライダー */
	.css-range {
		-webkit-appearance: none;
		appearance: none;
		outline: none;
		cursor: pointer;
		width: 100%;
		height: 12px;
		border-radius: 8px;
	}

	/* スライダー バー */
	.css-range::-webkit-slider-runnable-track {
		background: transparent;
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
		background-color: var(--color-base);
		border-radius: 50%;
		border: 3px solid var(--color-accent);
		transition: all 0.15s;
	}
	.css-range::-webkit-slider-thumb:hover {
		border: 3px solid var(--color-accent);
	}
</style>

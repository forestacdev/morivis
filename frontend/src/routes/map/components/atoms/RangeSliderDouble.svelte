<script lang="ts">
	import { onMount } from 'svelte';

	// Props型定義（Svelte 5スタイル）
	interface Props {
		label?: string;
		lowerValue?: number;
		upperValue?: number;
		min?: number;
		max?: number;
		primaryColor?: string;
		step?: number;
		disabled?: boolean;
		onChange?: (lower: number, upper: number) => void;
	}

	// $bindableを使用してコンポーネント外部からの値変更を可能にする
	let {
		label = 'デュアルレンジスライダー',
		lowerValue = $bindable(20),
		upperValue = $bindable(80),
		min = 0,
		max = 100,
		step = 1,
		primaryColor = 'var(--color-accent)',
		disabled = false,
		onChange
	}: Props = $props();

	const secondaryColor = '#fff';

	// 内部状態管理用
	let lowerSliderElement: HTMLInputElement;
	let upperSliderElement: HTMLInputElement;
	let sliderBackground = $state<string>('');
	let isInitialized = false;

	// スライダーの背景を更新する関数
	const updateSliderBackground = (value: number): void => {
		const ratio = ((value - min) / (max - min)) * 100;

		const minRatio = ((lowerValue - min) / (max - min)) * 100;
		const maxRatio = ((upperValue - min) / (max - min)) * 100;
		const leftColor = secondaryColor;
		const rightColor = secondaryColor;

		const gradient = `linear-gradient(90deg, ${leftColor} ${minRatio}%, ${primaryColor} ${minRatio}%, ${primaryColor} ${ratio}%, ${secondaryColor} ${ratio}%, ${secondaryColor} ${maxRatio}%, ${rightColor} ${maxRatio}%)`;
		sliderBackground = gradient;
	};

	// 下限スライダーの値変更処理
	const handleLowerChange = (event: Event): void => {
		const target = event.target as HTMLInputElement;
		const newValue = Number(target.value);

		// 上限値を超えないようにチェック
		if (newValue >= upperValue) {
			lowerValue = upperValue - step;
			target.value = String(lowerValue);
		} else {
			lowerValue = newValue;
		}

		updateSliderBackground(lowerValue);

		// コールバック関数があれば呼び出し
		onChange?.(lowerValue, upperValue);
	};

	// 上限スライダーの値変更処理
	const handleUpperChange = (event: Event): void => {
		const target = event.target as HTMLInputElement;
		const newValue = Number(target.value);

		// 下限値を下回らないようにチェック
		if (newValue <= lowerValue) {
			upperValue = lowerValue + step;
			target.value = String(upperValue);
		} else {
			upperValue = newValue;
		}

		updateSliderBackground(upperValue);

		// コールバック関数があれば呼び出し
		onChange?.(lowerValue, upperValue);
	};

	// コンポーネントマウント時の初期化
	onMount(() => {
		if (lowerSliderElement && upperSliderElement) {
			// 初期値の妥当性チェック
			if (lowerValue >= upperValue) {
				lowerValue = Math.max(min, upperValue - step);
			}

			// 初期背景設定
			updateSliderBackground(lowerValue);
			updateSliderBackground(upperValue);

			isInitialized = true;
		}
	});

	// リアクティブ文：外部からpropsが変更された時の処理
	$effect(() => {
		if (isInitialized && lowerSliderElement && upperSliderElement) {
			// 外部からの値変更に対応
			lowerSliderElement.value = String(lowerValue);
			upperSliderElement.value = String(upperValue);

			updateSliderBackground(lowerValue);
			updateSliderBackground(upperValue);
		}
	});
</script>

<!-- ラベル表示 -->
{#if label}
	<div class="mb-2 text-base">
		{label}
		<span class="">
			{lowerValue} - {upperValue}
		</span>
	</div>
{/if}

<!-- デュアルスライダー本体 -->

<div class="pointer-events-none grid w-full place-items-center px-2">
	<!-- 下限スライダー -->
	<input
		bind:this={lowerSliderElement}
		type="range"
		class="slider w-full"
		value={lowerValue}
		{min}
		{max}
		{step}
		{disabled}
		oninput={handleLowerChange}
		aria-label="下限値"
		style="--primary-color: {primaryColor}; --secondary-color: {secondaryColor};"
	/>

	<!-- 上限スライダー -->
	<input
		bind:this={upperSliderElement}
		type="range"
		class="slider w-full"
		value={upperValue}
		{min}
		{max}
		{step}
		{disabled}
		oninput={handleUpperChange}
		aria-label="上限値"
		style="--primary-color: {primaryColor}; --secondary-color: {secondaryColor};"
	/>
	<div
		class="absolute -z-10 w-[90%] rounded-full py-1"
		style="background: {sliderBackground}"
	></div>
</div>

<!-- 値表示（詳細版） -->
<div class="mt-2 flex justify-between px-2 text-base text-sm">
	<div class="">
		<span class="">{min}</span>
	</div>
	<div class="">
		<span class="">{max}</span>
	</div>
</div>

<style>
	.slider {
		grid-column: 1;
		grid-row: 1;
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
		outline: none;
		height: 8px;
		border-radius: 8px;

		pointer-events: none;
		transition: all 0.2s ease;
	}

	.slider::-webkit-slider-runnable-track {
	}

	/* つまみ部分：クリック有効 */
	.slider::-webkit-slider-thumb {
		pointer-events: auto;
	}
	.slider::-moz-range-thumb {
		pointer-events: auto;
	}
	.slider::-ms-thumb {
		pointer-events: auto;
	}

	.slider::-webkit-slider-runnable-track {
		background: transparent; /* スライダーバーの背景を透明に */
	}

	/* Webkit（Chrome, Safari）のスタイル */
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		background-color: var(--primary-color, #007bff);
		border-radius: 50%;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: all 0.2s ease;
		pointer-events: auto;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
	}

	/* Firefox用のスタイル */
	.slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background-color: var(--primary-color, #007bff);
		border-radius: 50%;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		pointer-events: auto;
	}
</style>

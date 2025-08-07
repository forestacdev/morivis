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
		minRangeColor?: string;
		maxRangeColor?: string;
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
		minRangeColor = '#ef4444', // 赤色（最小範囲）
		maxRangeColor = '#10b981', // 緑色（最大範囲）
		disabled = false,
		onChange
	}: Props = $props();

	const secondaryColor = 'black';

	// 内部状態管理用
	let lowerSliderElement: HTMLInputElement;
	let upperSliderElement: HTMLInputElement;
	let isInitialized = false;

	// 可変要素のスタイルを計算
	let rangeBarStyle = $derived.by(() => {
		const totalRange = max - min;
		const leftPosition = ((lowerValue - min) / totalRange) * 100;
		const rightPosition = ((upperValue - min) / totalRange) * 100;
		const width = rightPosition - leftPosition;

		return {
			left: `${leftPosition}%`,
			width: `${width}%`
		};
	});

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

			isInitialized = true;
		}
	});

	// リアクティブ文：外部からpropsが変更された時の処理
	$effect(() => {
		if (isInitialized && lowerSliderElement && upperSliderElement) {
			// 外部からの値変更に対応
			lowerSliderElement.value = String(lowerValue);
			upperSliderElement.value = String(upperValue);
		}
	});
</script>

<!-- ラベル表示 -->
{#if label}
	<div class="mb-4 text-base">
		{label}
		<span class="">
			{lowerValue} - {upperValue}
		</span>
	</div>
{/if}

<!-- デュアルスライダー本体 -->
<div class="relative grid w-full place-items-center">
	<!-- スライダー背景 -->

	<!-- スライダーコンテナ -->
	<div class="pointer-events-none absolute grid w-[90%] place-items-center">
		<div
			class="pointer-events-none absolute -z-10 h-2 rounded-full"
			style="background: {secondaryColor}; width: 100%;"
		></div>

		<!-- 選択範囲の色付きバー -->
		<div
			class="pointer-events-none absolute -z-10 h-2 rounded-full"
			style="background: {primaryColor}; left: calc({rangeBarStyle.left}); width: calc({rangeBarStyle.width});"
		></div>
	</div>

	<div class="pointer-events-none relative grid w-[95%] place-items-center">
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
		/>
	</div>
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
		background: transparent;
		pointer-events: none;
		transition: all 0.2s ease;
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
		border: none;
	}

	/* Webkit（Chrome, Safari）のスタイル */
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 25px;
		height: 25px;
		background-color: var(--color-base);
		border-radius: 50%;
		cursor: pointer;
		border: 2px solid black;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: all 0.2s ease;
		pointer-events: auto;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
	}
</style>

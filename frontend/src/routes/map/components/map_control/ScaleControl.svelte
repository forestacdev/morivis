<script lang="ts">
	import { type Map as MapLibreMap } from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	import { mapStore } from '$routes/stores/map';
	import { isMobile, showDataMenu, showLayerMenu, showOtherMenu } from '$routes/stores/ui';
	import { checkMobileWidth } from '$routes/map/utils/ui';

	let controlContainer = $state<HTMLDivElement | null>(null);
	let scaleElement = $state<HTMLDivElement | null>(null);
	let map: MapLibreMap | null = null;
	let show = $derived.by(() => {
		if ($showLayerMenu || $showDataMenu || $showOtherMenu) {
			return !checkMobileWidth();
		}
		return true;
	});

	// スケール計算用の定数
	const MAX_WIDTH = 100; // ピクセル

	// MapLibre GLと同じ丸め関数
	const getRoundNum = (num: number): number => {
		const pow10 = Math.pow(10, Math.floor(Math.log(num) / Math.LN10));
		let d = num / pow10;
		d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;
		return pow10 * d;
	};

	// MapLibre GLと同じ距離フォーマット
	const formatDistance = (distance: number): string => {
		if (distance >= 1000) {
			return `${distance / 1000}\u00a0km`;
		} else {
			return `${distance}\u00a0m`;
		}
	};

	// MapLibre GLと同じメートル計算
	const getMaxMeters = (
		map: MapLibreMap,
		maxWidth: number
	): { distance: number; width: number } => {
		// 画面中央の座標を取得
		const y = map.getContainer().clientHeight / 2;
		const x = map.getContainer().clientWidth / 2;

		// 中央から左右にmaxWidth/2ずつずらした点を取得
		const left = map.unproject([x - maxWidth / 2, y]);
		const right = map.unproject([x + maxWidth / 2, y]);

		// グローブ投影の場合の幅調整
		const globeWidth = Math.round(map.project(right).x - map.project(left).x);
		const actualMaxWidth = Math.min(maxWidth, globeWidth, map.getContainer().clientWidth);

		// distanceTo()メソッドで実際の距離を計算
		return { distance: left.distanceTo(right), width: actualMaxWidth };
	};

	// スケールバーを更新
	const updateScale = () => {
		if (!map || !scaleElement) return;

		const { distance: maxMeters, width: actualMaxWidth } = getMaxMeters(map, MAX_WIDTH);
		const distance = getRoundNum(maxMeters);
		const ratio = distance / maxMeters;

		scaleElement.style.width = `${actualMaxWidth * ratio}px`;
		scaleElement.textContent = formatDistance(distance);
	};

	onMount(() => {
		mapStore.onload(() => {
			map = mapStore.getMap();
			if (!map) return;

			// 初期スケールを設定
			updateScale();

			// マップイベントリスナーを追加
			map.on('moveend', updateScale);
		});

		showDataMenu.subscribe((show) => {
			if (controlContainer) {
				controlContainer.style.display = show ? 'none' : 'block';
			}
		});
	});

	onDestroy(() => {
		if (map) {
			map.off('moveend', updateScale);
		}
	});

	$effect(() => {
		if (show) {
			updateScale();
		}
	});

	// 	NOTE:debug
	// mapStore.onload(() => {
	// 	const map = mapStore.getMap();

	// 	map?.addControl(
	// 		new ScaleControl({
	// 			maxWidth: 100,
	// 			unit: 'metric'
	// 		})
	// 	);
	// });
</script>

{#if show}
	<div
		class="pointer-events-none absolute bottom-1 z-10 text-base opacity-90 {$showLayerMenu &&
		!$isMobile
			? 'left-[400px]'
			: 'left-[15px]'}"
		bind:this={controlContainer}
	>
		<div class="bg-opacity-80 px-2 font-mono text-[0.6rem] shadow-sm">
			<div
				bind:this={scaleElement}
				class="border-base border-b-2 border-l-2 border-r-2 pl-2 text-left leading-none"
				style="min-width: 30px;"
			></div>
		</div>
	</div>
{/if}

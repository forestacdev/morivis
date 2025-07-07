<script lang="ts">
	import Icon from '@iconify/svelte';

	import {
		attributionMap,
		type AttributionKey,
		type Attribution
	} from '$routes/map/data/attribution';
	import { layerAttributions } from '$routes/stores/attributions';
	import { update } from 'es-toolkit/compat';
	import { debounce } from 'es-toolkit';
	import { mapStore } from '$routes/stores/map';

	import { onMount, onDestroy } from 'svelte';

	import { useAnimation, performanceInfo, toggleDebugMode } from '$routes/stores/animation';

	let attributions = $state<Attribution[]>([]);
	let baseMapAttributionsKeys2 = $state<AttributionKey>([]);
	const baseMapAttributionsKeys: AttributionKey[] = ['OpenMapTiles', 'MIERUNE', 'OSM'];

	const updateAttributions = debounce((items: AttributionKey[]) => {
		const newAttributions = [...items, ...baseMapAttributionsKeys, ...baseMapAttributionsKeys2]
			.map((item) => {
				const atl = attributionMap.get(item);
				if (atl) return atl; // `atl` が存在する場合のみ `name` を返す
				return undefined; // 明示的に `undefined` を返す（型推論のため）
			})
			.filter((atl): atl is Attribution => atl !== undefined); // `undefined` を除外

		if (newAttributions.length > 0) {
			attributions = newAttributions;
		}
	}, 100);

	const extractUniqueKeys = (data: { id: string; key: string }[]): AttributionKey[] => {
		return [...new Set(data.map((item) => item.key))] as AttributionKey[];
	};

	layerAttributions.subscribe((items) => {
		updateAttributions(extractUniqueKeys(items));
	});

	mapStore.onStateChange((state) => {
		if (state.zoom) {
			// ズームレベルに応じて表示するアトリビューションを更新
			const zoom = state.zoom;
			const keys = [];
			if (zoom >= 4) {
				keys.push('国土地理院');
			}
			if (zoom <= 5) {
				keys.push('NASA');
			}
			if (zoom <= 8) {
				keys.push('USGS');
			}

			baseMapAttributionsKeys2 = keys;
		}
	});

	let container = $state<HTMLDivElement | null>(null);
	let track = $state<HTMLDivElement | null>(null);
	let position = 0;
	let speed = 2.1; // スクロール速度
	let direction = -1; // -1: 左から右, 1: 右から左
	let shouldScroll = false; // スクロールが必要かどうか
	let isInitialized = false; // 初期化完了フラグ

	// サイズ変更を監視してスクロール必要性を判定
	function checkScrollNeed() {
		if (!track || !container) return;

		const trackWidth = track.scrollWidth;
		const containerWidth = container.offsetWidth;
		const iconWidth = 40; // アイコン分の幅を考慮

		// トラックが親要素（アイコン分を除く）より大きい場合にスクロール開始
		const availableWidth = containerWidth - iconWidth;
		const needsScroll = trackWidth > availableWidth;

		if (needsScroll !== shouldScroll) {
			shouldScroll = needsScroll;

			if (shouldScroll) {
				// スクロール開始時に位置をリセット
				position = 0;
				console.log('スクロール開始 - トラック幅:', trackWidth, '利用可能幅:', availableWidth);
			} else {
				// スクロール停止時に位置をリセット
				position = 0;
				if (track) {
					track.style.transform = 'translateX(0px)';
				}
				console.log('スクロール停止 - コンテンツが収まります');
			}
		}
	}

	// アニメーション処理
	const animation = useAnimation('attribution-scroll', (deltaTime) => {
		if (!track || !container || !shouldScroll) return;

		position += speed * direction * deltaTime * 0.05;

		// シームレスループ（スクロールが必要な場合のみ）
		const trackWidth = track.scrollWidth;

		if (direction === -1 && position <= -(trackWidth / 2)) {
			position = 0;
		} else if (direction === 1 && position >= 0) {
			position = -(trackWidth / 2);
		}

		track.style.transform = `translateX(${position}px)`;
	});

	// ResizeObserver でサイズ変更を監視
	let resizeObserver: ResizeObserver | null = null;

	onMount(() => {
		if (container && track) {
			// 初期チェック（少し遅延させてDOM完成を待つ）
			setTimeout(() => {
				checkScrollNeed();
				isInitialized = true;
			}, 100);

			// ResizeObserver でコンテナサイズ変更を監視
			resizeObserver = new ResizeObserver(() => {
				if (isInitialized) {
					checkScrollNeed();
				}
			});

			resizeObserver.observe(container);
			resizeObserver.observe(track);
		}
	});

	onDestroy(() => {
		animation.cleanup();
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	});
</script>

{#if attributions}
	<div
		bind:this={container}
		class="pointer-events-none absolute bottom-[4px] right-0 z-10 flex w-full shrink-0 justify-end gap-2 text-nowrap px-2 text-white"
	>
		<!-- スクロールが必要な場合は複製、不要な場合は単一表示 -->
		<div
			bind:this={track}
			class="flex gap-2 {shouldScroll ? 'overflow-hidden' : ''}"
			style="transition: transform 0.1s ease-out;"
		>
			<!-- 通常時：1回のみ表示 -->
			{#each attributions as atl}
				<a
					class="pointer-events-auto grid flex-shrink-0 grow cursor-pointer select-none place-items-center rounded-full text-xs"
					href={atl.url}
					target="_blank"
					rel="noopener noreferrer"
				>
					<span>{atl.name}</span>
				</a>
			{/each}
		</div>

		<!-- 情報アイコン（常に表示） -->
		<span class="grid flex-shrink-0 place-items-center rounded-full">
			<Icon icon="lets-icons:info-alt-fill" class="h-6 w-6" />
		</span>
	</div>
{/if}

<style>
	/* スクロール時のスムーズな表示 */
	.overflow-hidden {
		mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
		-webkit-mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 5%,
			black 95%,
			transparent 100%
		);
	}

	/* スクロールアイテムのスタイル */
	[data-scroll-item] {
		transition: opacity 0.2s ease;
	}

	/* ホバー時の一時停止効果 */
	.attribution-container:hover [data-scroll-item] {
		animation-play-state: paused;
	}

	/* reset css */
	a {
		text-decoration: none;
	}

	a:active {
		color: inherit;
	}

	a:focus {
		outline: none;
	}
</style>

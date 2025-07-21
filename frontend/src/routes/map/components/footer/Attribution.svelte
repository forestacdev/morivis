<script lang="ts">
	import Icon from '@iconify/svelte';

	import {
		attributionMap,
		type AttributionKey,
		type Attribution
	} from '$routes/map/data/attribution';
	import { layerAttributions } from '$routes/stores/attributions';
	import { debounce } from 'es-toolkit';
	import { mapStore } from '$routes/stores/map';

	import { onMount, onDestroy } from 'svelte';

	import { useAnimation, performanceInfo, toggleDebugMode } from '$routes/stores/animation';

	let attributions = $state<Attribution[]>([]);
	let baseMapAttributionsKeys2 = $state<AttributionKey>([]);
	const baseMapAttributionsKeys: AttributionKey[] = [
		'OpenMapTiles',
		'MIERUNE',
		'OSM',
		'国土地理院最適化ベクトルタイル'
	];

	// サイズ変更を監視してスクロール必要性を判定
	const checkScrollNeed = () => {
		if (!track || !container) return;

		const trackWidth = track.offsetWidth;
		const containerWidth = container.offsetWidth;

		const needsScroll = containerWidth > trackWidth;

		if (needsScroll !== shouldScroll) {
			shouldScroll = needsScroll;

			if (shouldScroll) {
				// スクロール開始時に位置をリセット
				position = 0;
			} else {
				// スクロール停止時に位置をリセット
				position = 0;
				if (track) {
					track.style.transform = 'translateX(0px)';
				}
			}
		}
	};

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
		checkScrollNeed();
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
			const keys: AttributionKey = [];

			// TODO かぶるキーは除外
			// if (zoom >= 4) {
			// 	keys.push('国土地理院');
			// }
			if (zoom <= 5) {
				keys.push('NASA');
			}
			if (zoom <= 8) {
				keys.push('USGS');
			}

			baseMapAttributionsKeys2 = keys;
			checkScrollNeed();
		}
	});

	let container = $state<HTMLDivElement | null>(null);
	let track = $state<HTMLDivElement | null>(null);
	let position = 0;
	let speed = 0.7; // スクロール速度
	let direction = -1; // -1: 左から右, 1: 右から左
	let shouldScroll = $state<boolean>(false); // スクロールが必要かどうか
	let isInitialized = false; // 初期化完了フラグ

	// アニメーション処理
	const animation = useAnimation('attribution-scroll', (deltaTime) => {
		if (!track || !container || !shouldScroll) return;

		position += speed * direction * deltaTime * 0.05;

		// シームレスループ（スクロールが必要な場合のみ）
		const trackWidth = track.scrollWidth;

		if (direction === -1 && position <= -(trackWidth / 2)) {
			position = 0;
		} else if (direction === 1 && position >= 0) {
			position = -trackWidth / 2;
		}

		track.style.transform = `translateX(${position}px)`;
	});

	onMount(() => {
		if (container && track) {
			// 初期チェック（少し遅延させてDOM完成を待つ）
			isInitialized = true;
			checkScrollNeed();
		}
	});

	$effect(() => {
		if (container && track) {
			checkScrollNeed();
		}
	});

	window.addEventListener('resize', () => {
		if (isInitialized) {
			checkScrollNeed();
		}
	});

	onDestroy(() => {
		animation.cleanup();
	});
</script>

{#snippet link(atl: Attribution)}
	<a
		class="pointer-events-auto grid flex-shrink-0 grow cursor-pointer select-none place-items-center rounded-full text-xs hover:underline"
		href={atl.url}
		target="_blank"
		rel="noopener noreferrer"
	>
		<span>{atl.name}</span>
	</a>
{/snippet}

{#if attributions}
	<div
		class="pointer-events-none absolute bottom-0 right-0 flex w-full shrink-0 gap-2 text-nowrap bg-black/50 p-1 px-2 text-gray-300"
	>
		<!-- スクロールが必要な場合は複製、不要な場合は単一表示 -->
		<div
			bind:this={track}
			class="flex w-full gap-2 {shouldScroll ? 'justify-start' : 'justify-end'}"
		>
			<!-- 通常時：1回のみ表示 -->

			<!-- スクロール時：複製表示 -->
			<div bind:this={container} class="flex gap-2">
				{#each attributions as atl}
					{@render link(atl)}
				{/each}
			</div>
			<div class="flex gap-2">
				{#if shouldScroll}
					{#each attributions as atl}
						{@render link(atl)}
					{/each}
				{/if}
			</div>
		</div>

		<!-- 情報アイコン（常に表示） -->
		<!-- <span class="grid flex-shrink-0 place-items-center rounded-full">
			<Icon icon="lets-icons:info-alt-fill" class="h-6 w-6" />
		</span> -->
	</div>
{/if}

<style>
	/* reset css */
	/* a {
		text-decoration: none;
	}

	a:active {
		color: inherit;
	}

	a:focus {
		outline: none;
	} */
</style>

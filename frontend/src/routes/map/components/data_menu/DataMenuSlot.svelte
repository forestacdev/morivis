<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import { showNotification } from '$routes/stores/notification';

	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { getLayerImage } from '$routes/map/utils/image';
	import type { ImageResult } from '$routes/map/utils/image';
	import { getPrefectureCode } from '$routes/map/data/pref';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import { fade, fly } from 'svelte/transition';
	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import { getLayerIcon, getLayerType } from '$routes/map/utils/entries';
	import { getAttributionName } from '$routes/map/data/attribution';
	import { showDataMenu } from '$routes/stores/ui';

	interface Props {
		dataEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null;
		itemHeight: number;
		index: number;
		isLeftEdge: boolean;
		isRightEdge: boolean;
		isTopEdge: boolean;
	}

	let {
		dataEntry,
		showDataEntry = $bindable(),
		itemHeight = $bindable(),
		index,
		isLeftEdge,
		isRightEdge,
		isTopEdge
	}: Props = $props();

	let isHover = $state(false);
	// Blob URLとクリーンアップ関数を管理するための状態

	let isImageError = $state<boolean>(false);

	let layertype = $derived.by(() => {
		return getLayerType(dataEntry);
	});

	// 画像読み込み完了後のクリーンアップ
	const handleImageLoad = (_imageResult: ImageResult) => {
		if (_imageResult.cleanup) {
			_imageResult.cleanup();
		}
	};

	let isAdded = $derived.by(() => {
		return $activeLayerIdsStore.includes(dataEntry.id);
	});
	let container = $state<HTMLElement | null>(null);

	const updateItemHeight = (newHeight: number) => {
		itemHeight = newHeight + 20;
	};

	onMount(() => {
		window?.addEventListener('resize', () => {
			if (container) {
				const h = container.clientHeight;
				updateItemHeight(h);
			}
		});
	});

	$effect(() => {
		if (container) {
			const h = container.clientHeight;
			updateItemHeight(h);
		}
	});

	let promise = $state<Promise<ImageResult | undefined>>();

	$effect(() => {
		try {
			promise = getLayerImage(dataEntry);
		} catch (error) {
			isImageError = true;
			console.error('Error generating icon image:', error);
			promise = Promise.resolve(undefined);
		}
	});

	const addData = (id: string) => {
		activeLayerIdsStore.add(id);
		showNotification(`${dataEntry.metaData.name}を追加しました`, 'success');
	};
	const deleteData = (id: string) => {
		activeLayerIdsStore.remove(id);
	};

	let prefCode = $derived.by(() => {
		return getPrefectureCode(dataEntry.metaData.location);
	});

	showDataMenu.subscribe((value) => {
		if (value) {
			if (container) {
				const h = container.clientHeight;
				updateItemHeight(h);
			}
		}
	});

	const getTransformOrigin = () => {
		// 角の場合
		if (isTopEdge && isLeftEdge) return 'top left';
		if (isTopEdge && isRightEdge) return 'top right';

		// 辺の場合
		if (isTopEdge) return 'top';
		if (isLeftEdge) return 'left';
		if (isRightEdge) return 'right';

		// 中央の場合
		return 'center';
	};
</script>

<div
	class="aspect-3/4 relative flex shrink-0 grow flex-col items-center overflow-hidden rounded-lg bg-black transition-all duration-150 lg:hover:z-10 lg:hover:scale-105 lg:hover:shadow-lg"
	style="transform-origin: {getTransformOrigin()}"
	bind:this={container}
	onmouseover={() => (isHover = true)}
	onmouseleave={() => (isHover = false)}
	onfocus={() => (isHover = true)}
	onblur={() => (isHover = false)}
	tabindex="0"
	role="button"
>
	<!-- 追加ボタン -->
	{#if isHover}
		<div transition:fade={{ duration: 200 }} class="absolute right-2 top-2 z-10 shrink-0">
			{#if isAdded}
				<button
					onclick={(e) => {
						e.stopPropagation();
						deleteData(dataEntry.id);
					}}
					class="c-btn-sub grid place-items-center p-1"
				>
					<Icon icon="ic:round-minus" class=" h-6 w-6" />
				</button>
			{:else}
				<button
					onclick={(e) => {
						e.stopPropagation();
						addData(dataEntry.id);
					}}
					class="c-btn-confirm grid place-items-center p-1"
				>
					<Icon icon="material-symbols:add" class=" h-6 w-6" />
				</button>
			{/if}
		</div>
	{/if}
	<button
		onclick={() => {
			if (!isAdded) showDataEntry = dataEntry;
		}}
		class="flex h-full w-full cursor-pointer flex-col"
	>
		<div class="group relative flex aspect-square w-full shrink-0 overflow-hidden">
			{#await promise then imageResult}
				{#if imageResult}
					<img
						src={imageResult.url}
						class="c-no-drag-icon absolute h-full w-full object-cover transition-transform duration-150"
						alt={dataEntry.metaData.name}
						onload={() => handleImageLoad(imageResult)}
						loading="lazy"
						onerror={() => {
							console.error('Image loading failed:', dataEntry.metaData.name);
							isImageError = true;
						}}
					/>
				{/if}
			{:catch}
				<div class="text-accent">データが取得できませんでした</div>
			{/await}
			<div class="pointer-events-none absolute h-full w-full">
				<div class="c-bg absolute h-full w-full"></div>
			</div>
			<!-- オーバーレイ -->
			{#if !isHover}
				<div transition:fade={{ duration: 150 }} class="pointer-events-none absolute h-full w-full">
					<div class="c-gradient absolute h-full w-full"></div>
				</div>
			{/if}
			{#if isHover && !isAdded}
				<div
					transition:fade={{ duration: 150 }}
					class="pointer-events-none absolute grid h-full w-full place-items-center"
				>
					<div
						class="flex items-center justify-center gap-1 rounded-full bg-black/80 p-2 px-4 text-lg text-white"
					>
						<Icon icon="akar-icons:eye" class="h-7 w-7" /><span>プレビュー</span>
					</div>
				</div>
			{/if}
			{#if isHover}
				<!-- タグ -->
				<div
					transition:fade={{ duration: 150 }}
					class="absolute bottom-2 flex items-center gap-1 pl-2 text-gray-300"
				>
					{#each dataEntry.metaData.tags as tag}
						<span class="bg-sub rounded-full p-1 px-2 text-xs">{tag}</span>
					{/each}
				</div>
			{/if}
			{#if isAdded}
				<div
					transition:fade={{ duration: 150 }}
					class="pointer-events-none absolute grid h-full w-full place-items-center"
				>
					<div
						class=" flex w-full items-center justify-center gap-1 bg-black/60 p-2 px-4 text-lg text-white"
					>
						<Icon icon="lets-icons:check-fill" class="h-7 w-7" /><span>追加済み</span>
					</div>
				</div>
			{/if}

			{#if layertype}
				<div
					class="bounded-full absolute aspect-square rounded-full bg-black/50 p-2 text-base max-lg:left-1 max-lg:top-1 lg:left-2 lg:top-2"
				>
					<Icon icon={getLayerIcon(layertype)} class="max-lg:h-5 max-lg:w-5 lg:h-6 lg:w-6" />
				</div>
			{/if}
		</div>

		<!-- 詳細情報 -->
		<div
			class="relative flex h-full w-full flex-col items-end justify-end gap-1 pb-4 max-lg:p-1 lg:p-2"
		>
			<!-- タイトル -->
			<div class="flex h-full w-full flex-col justify-center text-left text-white lg:gap-1 lg:pl-2">
				<span class="max-lg:text-md max-lg:leading-5 lg:text-lg lg:leading-6"
					>{dataEntry.metaData.name}</span
				>
				<!-- 出典 -->
				<span class="text-left text-xs text-gray-400">
					{getAttributionName(dataEntry.metaData.attribution)}</span
				>
				<div
					class="absolute bottom-0 right-0 grid h-full place-items-center opacity-20 max-lg:pr-1 lg:pr-2"
				>
					{#if dataEntry.metaData.location === '森林文化アカデミー'}
						<div class="grid place-items-center [&_path]:fill-white">
							<FacIcon width={'60px'} />
						</div>
					{/if}
					{#if prefCode}
						<div class="[&_path]:fill-base grid aspect-square place-items-center">
							<PrefectureIcon width={'80px'} code={prefCode} />
						</div>
						<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
					{/if}
					{#if dataEntry.metaData.location === '全国'}
						<div class="grid place-items-center">
							<Icon icon="emojione-monotone:map-of-japan" class="h-20 w-20 text-base" />
							<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
						</div>
					{/if}
					{#if dataEntry.metaData.location === '世界'}
						<div class="grid place-items-center">
							<Icon icon="fxemoji:worldmap" class="[&_path]:fill-base h-20 w-20" />
							<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
						</div>
					{/if}
				</div>
			</div>
		</div>
	</button>
</div>

<style>
	.c-bg {
		background: radial-gradient(
			circle,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0) 60%,
			rgba(0, 0, 0, 0.4) 100%
		);
	}

	.c-gradient {
		background: linear-gradient(
			0deg,
			rgb(0, 0, 0) 0%,

			rgba(233, 233, 233, 0) 100%
		);
	}
</style>

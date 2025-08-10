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
	import FacLogo from '$lib/components/svgs/FacLogo.svelte';
	import { getLayerIcon, getLayerType } from '$routes/map/utils/entries';
	import { getAttributionName } from '$routes/map/data/attribution';

	interface Props {
		dataEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null;
		itemHeight: number;
		index: number;
	}

	let { dataEntry, showDataEntry = $bindable(), itemHeight = $bindable(), index }: Props = $props();

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
</script>

<div
	class="aspect-3/4 relative flex shrink-0 grow flex-col items-center overflow-hidden rounded-lg bg-black transition-all duration-150 lg:hover:z-10 lg:hover:shadow-lg"
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
			<div class="c-bg pointer-events-none absolute grid h-full w-full place-items-center"></div>
			<div
				class="pointer-events-none absolute grid h-full w-full place-items-center bg-black/50 transition-opacity duration-150 {isAdded ||
				isHover
					? 'opacity-0'
					: 'opacity-0'}"
			>
				{#if isAdded}
					<span class="z-10 text-lg text-white">地図に追加済み</span>
				{:else if isHover}
					<span class="z-10 text-lg text-white">プレビュー</span>
				{/if}
			</div>

			{#if layertype}
				<div
					class="bounded-full absolute left-2 top-2 aspect-square rounded-full bg-black/50 p-2 text-base"
				>
					<Icon icon={getLayerIcon(layertype)} class="h-6 w-6" />
				</div>
			{/if}

			<div class="absolute bottom-0 right-0 grid place-items-center pr-2 opacity-30">
				{#if dataEntry.metaData.location === '森林文化アカデミー'}
					<!-- <div class="absolute bottom-2 right-2 grid place-items-center [&_path]:fill-white">
				<FacLogo width={'150px'} />
			</div> -->
					<div class="grid place-items-center">
						<img
							class="h-[50px] w-[50px] rounded-full object-cover"
							src="./mapicon.png"
							alt={'森林文化アカデミー'}
						/>
					</div>
				{/if}
				{#if prefCode}
					<div class="[&_path]:fill-base grid aspect-square place-items-center">
						<PrefectureIcon width={'60px'} code={prefCode} />
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

		<!-- 詳細情報 -->
		<div class="flex h-full w-full flex-col items-end justify-end gap-1 p-2 pb-4">
			<!-- タグ -->
			<!-- <div class="flex items-center gap-1 text-gray-300">
				{#each dataEntry.metaData.tags as tag}
					<span class="bg-sub rounded-full p-1 px-2 text-xs">{tag}</span>
				{/each}
			</div> -->
			<!-- タイトル -->
			<div class="flex w-full flex-col justify-end gap-1 text-left text-white">
				<span class="text-lg leading-6">{dataEntry.metaData.name}</span>
				<!-- 出典 -->
				<span class="text-left text-xs text-gray-400">
					{getAttributionName(dataEntry.metaData.attribution)}</span
				>
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
			rgba(0, 0, 0, 0.7) 100%
		);
		background: linear-gradient(0deg, rgb(0, 0, 0) 0%, rgba(233, 233, 233, 0) 100%);
	}

	.c-gradient {
		background: linear-gradient(
			0deg,
			rgb(0, 0, 0) 0%,
			rgb(0, 0, 0) 0%,
			rgba(233, 233, 233, 0) 100%
		);
	}
</style>

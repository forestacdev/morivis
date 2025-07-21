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
	class="relative m-2 flex aspect-square shrink-0 grow flex-col items-center overflow-hidden rounded-lg bg-black transition-all duration-150 hover:z-10 hover:scale-105 hover:shadow-lg"
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
					class="c-btn-cancel grid place-items-center p-2"
				>
					<Icon icon="ic:round-minus" class=" h-8 w-8" />
				</button>
			{:else}
				<button
					onclick={(e) => {
						e.stopPropagation();
						addData(dataEntry.id);
					}}
					class="c-btn-confirm grid place-items-center p-2"
				>
					<Icon icon="material-symbols:add" class=" h-8 w-8" />
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
		<div class="group relative flex aspect-video w-full shrink-0 overflow-hidden">
			{#await promise then imageResult}
				{#if imageResult}
					<img
						src={imageResult.url}
						class="c-no-drag-icon absolute h-full w-full object-cover transition-transform duration-150"
						alt={dataEntry.metaData.name}
						onload={() => handleImageLoad(imageResult)}
						loading="lazy"
						onerror={() => {
							isImageError = true;
						}}
					/>
				{/if}
			{:catch}
				<div>画像の取得に失敗</div>
			{/await}
			<div class="c-bg pointer-events-none absolute grid h-full w-full place-items-center"></div>
			<div
				class="pointer-events-none absolute grid h-full w-full place-items-center bg-black/50 transition-opacity duration-150 {isAdded ||
				isHover
					? 'opacity-100'
					: 'opacity-0'}"
			>
				{#if isAdded}
					<span class="z-10 text-lg text-white">地図に追加済み</span>
				{:else if isHover}
					<span class="z-10 text-lg text-white">プレビュー</span>
				{/if}
			</div>

			<!-- 出典 -->
			<span class="absolute bottom-1 right-1 rounded-lg bg-black/40 p-1 px-2 text-xs text-white"
				>{dataEntry.metaData.attribution}</span
			>
			{#if layertype}
				<div
					class="bounded-full absolute left-2 top-2 aspect-square rounded-full bg-black/50 p-2 text-base"
				>
					<Icon icon={getLayerIcon(layertype)} class="h-6 w-6" />
				</div>
			{/if}
		</div>

		<div class="flex w-full flex-col gap-2 p-2">
			<!-- タイトル -->
			<div class="text-left text-base text-lg">{dataEntry.metaData.name}</div>
			<div class="flex items-center gap-1 text-sm text-gray-300">
				{#each dataEntry.metaData.tags as tag}
					<span class="bg-sub rounded-full p-1 px-2">{tag}</span>
				{/each}
			</div>
		</div>
		{#if prefCode}
			<div class="absolute bottom-0 right-0 grid place-items-center">
				<div class="[&_path]:fill-sub grid aspect-square h-[100px] place-items-center">
					<PrefectureIcon width={'70px'} code={prefCode} />
				</div>
				<span class="absolute text-base text-xs">{dataEntry.metaData.location}</span>
			</div>
		{/if}
		{#if dataEntry.metaData.location === '森林文化アカデミー'}
			<div class="absolute bottom-2 right-2 grid place-items-center [&_path]:fill-white">
				<FacLogo width={'150px'} />
			</div>
			<!-- <div class="absolute bottom-0 right-0 grid place-items-center">
			<img
				class="h-[50px] w-[50px] rounded-full object-cover"
				src="./mapicon.png"
				alt={'森林文化アカデミー'}
			/>
		</div> -->
		{/if}
		{#if dataEntry.metaData.location === '全国'}
			<div class="absolute bottom-2 right-2 grid place-items-center">
				<Icon icon="emojione-monotone:map-of-japan" class="text-sub h-20 w-20" />
				<span class="absolute text-base text-xs">{dataEntry.metaData.location}</span>
			</div>
		{/if}
		{#if dataEntry.metaData.location === '世界'}
			<div class="absolute bottom-0 right-2 grid place-items-center">
				<Icon icon="fxemoji:worldmap" class="[&_path]:fill-sub h-20 w-20" />
				<span class="absolute text-base text-xs">{dataEntry.metaData.location}</span>
			</div>
		{/if}
	</button>
</div>

<style>
	.c-bg {
		background: radial-gradient(
			circle,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0) 60%,
			rgba(0, 0, 0, 0.5) 100%
		);
	}
</style>

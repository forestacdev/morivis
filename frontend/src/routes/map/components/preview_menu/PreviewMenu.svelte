<script lang="ts">
	import Icon from '@iconify/svelte';
	import DOMPurify from 'dompurify';
	import { fade, fly } from 'svelte/transition';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';

	import MapPane from '$routes/map/components/preview_menu/MapPane.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { getAttributionName } from '$routes/map/data/attribution';
	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import { getPrefectureCode } from '$routes/map/data/pref';
	import { isBBoxInside } from '$routes/map/utils/map';
	import { mapStore } from '$routes/stores/map';
	import { getLayerIcon, getLayerType } from '$routes/map/utils/entries';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();

	const formatDescription = (text: string): string => {
		// 先頭の改行を除去
		const trimmedText = text.replace(/^\n+/, '');

		const urlRegex = /(https?:\/\/[^\s））\]」」＞>、。,]+)/g;
		const linked = trimmedText.replace(urlRegex, (url) => {
			return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
		});
		const withBreaks = linked.replace(/\n/g, '<br>');
		return DOMPurify.sanitize(withBreaks, {
			ALLOWED_TAGS: ['a', 'br'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		});
	};

	let prefCode = $derived.by(() => {
		if (showDataEntry) {
			return getPrefectureCode(showDataEntry.metaData.location);
		}
	});

	let layertype = $derived.by(() => {
		if (showDataEntry) {
			return getLayerType(showDataEntry);
		}
	});

	$effect(() => {
		if (showDataEntry) {
			const mapBbox = mapStore.getMapBounds();
			if (!isBBoxInside(mapBbox, showDataEntry.metaData.bounds)) {
				mapStore.focusLayer(showDataEntry);
			}
		}
	});
</script>

{#if showDataEntry}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main lg:w-side-menu absolute left-0 top-0 z-20 flex h-full flex-col gap-2 overflow-hidden px-2 max-lg:hidden"
	>
		<div class="flex w-full justify-start gap-2 p-2 py-4">
			<Icon icon="akar-icons:eye" class="h-7 w-7 text-base" />
			<span class="select-none text-base text-lg max-lg:hidden">データプレビュー</span>
		</div>
		<div class="flex h-full flex-col text-base">
			<!-- ヘッダー -->
			<div class="relative flex flex-col items-center gap-2 pb-8">
				<!-- アイコン -->
				<div
					class="relative isolate grid h-[180px] w-[180px] shrink-0 place-items-center rounded-full bg-black drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"
				>
					<LayerIcon layerEntry={showDataEntry} />
					<!-- タイプアイコン -->
					{#if layertype}
						<div
							class="bounded-full bg-base absolute bottom-1 right-1 aspect-square rounded-full border-2 border-gray-900 p-2 text-black"
						>
							<Icon icon={getLayerIcon(layertype)} class="h-7 w-7" />
						</div>
					{/if}
				</div>

				<!-- タイトル -->
				<div class="flex flex-col items-center gap-2">
					<div class="text-2xl">{showDataEntry?.metaData.name}</div>
					<span class="text-gray-300"
						>{getAttributionName(showDataEntry?.metaData.attribution)}</span
					>

					{#if showDataEntry?.metaData.downloadUrl}
						<a
							class="c-btn-confirm mt-4 flex select-none items-center justify-start gap-2 rounded-full p-2 px-4"
							href={showDataEntry?.metaData.downloadUrl}
							target="_blank"
							rel="noopener noreferrer"
							><Icon icon="majesticons:open" class="h-6 w-6" />
							<span>データ提供元サイト</span></a
						>
					{/if}
				</div>

				<!-- 背景 -->
				<div class="absolute -z-10 grid w-full place-items-center opacity-15">
					{#if showDataEntry.metaData.location === '森林文化アカデミー'}
						<div class="grid aspect-square place-items-center [&_path]:fill-white">
							<FacIcon width={'100%'} />
						</div>
					{/if}
					{#if prefCode}
						<div class="[&_path]:fill-base grid aspect-square w-full place-items-center">
							<PrefectureIcon width={'100%'} code={prefCode} />
						</div>
						<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
					{/if}
					{#if showDataEntry.metaData.location === '全国'}
						<div class="grid aspect-square w-full place-items-center">
							<Icon icon="emojione-monotone:map-of-japan" class="h-full w-full text-base" />
							<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
						</div>
					{/if}
					{#if showDataEntry.metaData.location === '世界'}
						<div class="grid aspect-square w-full place-items-center">
							<Icon icon="fxemoji:worldmap" class="[&_path]:fill-base h-full w-full" />
							<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
						</div>
					{/if}
				</div>
			</div>

			<div class="c-scroll gap-2 overflow-y-auto overflow-x-hidden">
				{#if showDataEntry.metaData.description || showDataEntry.metaData.sourceDataName}
					{#if showDataEntry}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<div class="rounded-lg p-2 text-justify text-sm">
							{#if showDataEntry?.metaData.sourceDataName}
								元データ名:「{showDataEntry?.metaData.sourceDataName}」<br />
							{/if}

							{#if showDataEntry?.metaData.description}
								{@html formatDescription(showDataEntry?.metaData.description)}
							{/if}
						</div>
					{/if}
				{/if}

				<!-- <div class="flex flex-col gap-2 py-2 pb-4">

					{#if showDataEntry}
						<MapPane bind:showDataEntry />
					{/if}
				</div> -->
				<div class="mb-2 flex gap-2">
					<Icon icon="tabler:map-pin" class="h-6 w-6" />
					<span class="">{showDataEntry?.metaData.location}</span>
				</div>

				<!-- タグ -->
				<div class="flex gap-2 py-2">
					<div class="flex gap-1">
						<Icon icon="tabler:tag-filled" class="h-6 w-6" />
					</div>
					<div class="flex items-center gap-1 text-gray-300">
						{#each showDataEntry?.metaData.tags as tag}
							<span class="rounded-lg bg-black p-1 px-2 text-sm">{tag}</span>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
</style>

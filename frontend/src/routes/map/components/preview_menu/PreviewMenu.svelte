<script lang="ts">
	import Icon from '@iconify/svelte';
	import DOMPurify from 'dompurify';
	import { fade, fly } from 'svelte/transition';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';

	import MapPane from '$routes/map/components/preview_menu/Map.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { getAttributionName } from '$routes/map/data/attribution';
	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import { getPrefectureCode } from '$routes/map/data/pref';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			showDataEntry = null;
		}
	};

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
		return getPrefectureCode(showDataEntry.metaData.location);
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showDataEntry}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main lg:w-side-menu absolute left-0 top-0 z-20 flex h-full flex-col gap-2 overflow-hidden px-2 pt-4 max-lg:hidden"
	>
		<!-- <div class="absolute top-0 z-10 flex w-full justify-between p-4 px-6">
			<button
				onclick={() => (showDataEntry = null)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div> -->
		<div class="flex h-full flex-col text-base">
			<!-- ヘッダー -->
			<div class="relative flex flex-col items-center gap-2 pb-4">
				<!-- アイコン -->
				<div
					class="relative isolate grid h-[120px] w-[120px] shrink-0 place-items-center rounded-full bg-black drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"
				>
					<LayerIcon layerEntry={showDataEntry} />
				</div>

				<!-- タイトル -->
				<div class="flex flex-col items-center gap-2">
					<div class="text-2xl">{showDataEntry?.metaData.name}</div>
					<span class="text-sm opacity-90"
						>{getAttributionName(showDataEntry?.metaData.attribution)}</span
					>
					<div class="flex flex-col gap-2 py-2">
						<div class="flex items-center gap-1 text-gray-300">
							{#each showDataEntry?.metaData.tags as tag}
								<span class="rounded-full bg-black p-1 px-2 text-sm">{tag}</span>
							{/each}
						</div>
					</div>

					{#if showDataEntry?.metaData.downloadUrl}
						<a
							class="c-btn-confirm flex select-none items-center justify-start gap-2 rounded-full p-2 px-4"
							href={showDataEntry?.metaData.downloadUrl}
							target="_blank"
							rel="noopener noreferrer"
							><Icon icon="majesticons:open" class="h-6 w-6" />
							<span>データ提供元サイト</span></a
						>
					{/if}
				</div>
				<div class="absolute -z-10 grid aspect-video h-full place-items-center opacity-15">
					{#if showDataEntry.metaData.location === '森林文化アカデミー'}
						<div class="grid place-items-center [&_path]:fill-white">
							<FacIcon width={'95%'} />
						</div>
					{/if}
					{#if prefCode}
						<div class="[&_path]:fill-base grid place-items-center">
							<PrefectureIcon width={'100%'} code={prefCode} />
						</div>
						<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
					{/if}
					{#if showDataEntry.metaData.location === '全国'}
						<div class="grid h-full w-full place-items-center">
							<Icon icon="emojione-monotone:map-of-japan" class="h-full w-full text-base" />
							<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
						</div>
					{/if}
					{#if showDataEntry.metaData.location === '世界'}
						<div class="grid h-full w-full place-items-center">
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

							{@html formatDescription(showDataEntry?.metaData.description)}
						</div>
					{/if}
				{/if}

				<div class="flex flex-col gap-2 py-2 pb-4">
					<div class="flex gap-1">
						<Icon icon="tabler:map-pin" class="h-6 w-6" />
						<span class="font-bold">データ範囲</span>
					</div>

					{#if showDataEntry}
						<MapPane bind:showDataEntry />
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
</style>

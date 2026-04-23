<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	import FeatureSidePanel from './FeatureSidePanel.svelte';
	import { ICONS } from '$lib/icons';
	import { getWikipediaArticle } from '$routes/map/api/wikipedia';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeaturePanelData, SearchAddressPanelData } from '$routes/map/types';
	import { normalizeSchoolName } from '$routes/map/utils/data/normalize';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';

	interface Props {
		panelData: FeaturePanelData | null;
		layerEntries: GeoDataEntry[];
		onClose: () => void;
		children: Snippet;
	}

	let { panelData, layerEntries, onClose, children }: Props = $props();

	let targetLayer = $derived.by(() => {
		if (panelData?.kind !== 'layer-feature') return null;
		return layerEntries.find((entry) => entry.id === panelData.layerId) ?? null;
	});

	const edit = () => {
		if (targetLayer && targetLayer.type === 'vector') {
			selectedLayerId.set(targetLayer.id);
			isStyleEdit.set(true);
			onClose(); // Close the feature menu after editing
		}
	};

	const getWikipedia = async (data: SearchAddressPanelData) => {
		const name = normalizeSchoolName(data.result.name);
		const res = await getWikipediaArticle(name);
		return Promise.resolve(res);
	};
</script>

<!-- PC -->
<FeatureSidePanel
	open={panelData !== null}
	transition={panelData?.kind === 'search-address' ? 'fly' : 'scale'}
	{onClose}
>
	{#snippet headerActions()}
		{#if panelData?.kind === 'layer-feature' && panelData.layerId !== 'fac_poi'}
			<button
				onclick={edit}
				class="c-btn-confirm flex items-center justify-center gap-2 px-3 py-1 pr-4 max-lg:hidden"
			>
				<Icon icon="uil:setting" class="h-6 w-6" />
				<span class="text-sm select-none">スタイルの変更</span>
			</button>
		{/if}
	{/snippet}

	{#if panelData?.kind === 'layer-feature'}
		{@render children()}
	{:else if panelData?.kind === 'search-address'}
		{@const result = panelData.result}
		{#await getWikipedia(panelData)}
			<!-- ローディング中 -->
			<div class="flex h-full w-full flex-col items-center justify-center gap-4">
				<div
					class="border-t-accent h-12 w-12 animate-spin rounded-full border-4 border-gray-300"
				></div>
				<p class="text-gray-400">読み込み中...</p>
			</div>
		{:then wikiMenuData}
			<div in:fade={{ duration: 100 }}>
				<!-- 画像 -->
				<div class="relative w-full p-2">
					{#if wikiMenuData?.thumbnail?.source}
						<img
							in:fade={{ duration: 300 }}
							class="block aspect-video h-full w-full rounded-lg object-cover"
							alt="画像"
							src={wikiMenuData.thumbnail.source}
						/>
						<!-- ライセンス表示 -->
						{#if wikiMenuData.imageLicense}
							<div class="mt-1 text-xs text-gray-400">
								{#if wikiMenuData.imageLicense.artist}
									<span>{wikiMenuData.imageLicense.artist}</span>
									<span class="mx-1">/</span>
								{/if}
								{#if wikiMenuData.imageLicense.licenseUrl}
									<a
										href={wikiMenuData.imageLicense.licenseUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-accent hover:underline"
									>
										{wikiMenuData.imageLicense.licenseShortName}
									</a>
								{:else}
									<span>{wikiMenuData.imageLicense.licenseShortName}</span>
								{/if}
							</div>
						{/if}
					{/if}

					<div
						class="bottom-0 left-0 flex h-full w-full shrink-0 grow flex-col justify-end gap-1 pt-4 text-base"
					>
						<span class="text-[22px] font-bold"
							>{wikiMenuData ? wikiMenuData.title : result.name}</span
						>
						<span class="text-[14px] text-gray-300"
							>{wikiMenuData ? wikiMenuData.prefecture : result.location}</span
						>
					</div>
				</div>

				<div class="pl-2">
					<!-- 詳細情報 -->
					<div class="flex h-full w-full flex-col gap-2 pr-2">
						<div class="flex flex-col gap-2 rounded-lg bg-black p-2">
							<!-- 座標 -->
							<div class="flex w-full justify-start gap-2">
								<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
								<span class="text-accent">
									{#if wikiMenuData?.coordinates}
										{wikiMenuData.coordinates.lat.toFixed(6)}, {wikiMenuData.coordinates.lon.toFixed(
											6
										)}
									{:else}
										{result.point[1].toFixed(6)}, {result.point[0].toFixed(6)}
									{/if}
								</span>
							</div>
						</div>

						<!-- 概要説明 -->
						{#if wikiMenuData}
							<div class="flex w-full items-center justify-center">
								<a
									class="c-btn-confirm mt-4 flex items-center justify-start gap-2 rounded-full p-2 px-4 select-none"
									href={wikiMenuData.url}
									target="_blank"
									rel="noopener noreferrer"
									><Icon icon={ICONS.open} class="h-6 w-6" />
									<span>Wikipediaを見る</span></a
								>
							</div>
							<span class="my-2 text-justify text-base">{wikiMenuData.extract}</span>
						{/if}
					</div>
				</div>
				<!-- 余白 -->
				<div class="h-[200px] w-full shrink-0"></div>
			</div>
		{/await}
	{/if}
</FeatureSidePanel>

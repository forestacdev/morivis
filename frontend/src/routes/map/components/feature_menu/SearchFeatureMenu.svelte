<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import AttributeItem from '$routes/map/components/feature_menu/AttributeItem.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';

	import { checkMobile, checkPc } from '$routes/map/utils/ui';
	import { getWikipediaArticle, type WikiArticle } from '$routes/map/api/wikipedia';
	import { normalizeSchoolName } from '$routes/map/utils/normalized';
	import type { result } from 'es-toolkit/compat';
	import type { ResultPoiData, ResultAddressData } from '$routes/map/utils/feature';

	interface Props {
		selectedSearchResultData: ResultPoiData | ResultAddressData | null;
		selectedSearchId: number | null;
	}
	let { selectedSearchResultData = $bindable(), selectedSearchId = $bindable() }: Props = $props();

	let isLoading = $state(true);

	// TODO: POIデータとの一貫性を持たせる

	// URLを省略する関数
	const truncateUrl = (url: string, maxLength = 50) => {
		if (url.length <= maxLength) return url;
		return url.substring(0, maxLength) + '...';
	};

	const promise = async () => {
		if (selectedSearchResultData) {
			if (selectedSearchResultData.type === 'address') {
				const name = normalizeSchoolName(selectedSearchResultData.name);
				const res = await getWikipediaArticle(name);
				isLoading = false;
				return Promise.resolve(res);
			}
		}
		isLoading = false;
		return Promise.resolve(null);
	};

	// if (result.type === 'address') {
	// 		const name = normalizeSchoolName(result.name);
	// 		const article = await getWikipediaArticle(name);
	// 		if (article) {
	// 			wikiMenuData = article;
	// 		} else {
	// 			console.log('No Wikipedia article found for:', result.name);
	// 		}
	// 	}
</script>

<!-- PC -->
{#if selectedSearchResultData && selectedSearchResultData.type === 'address' && checkPc()}
	<div
		transition:fly={{
			duration: 300,
			x: -100,
			opacity: 0
		}}
		class="bg-main w-side-menu max absolute top-0 left-0 z-20 flex h-full flex-col max-lg:hidden"
	>
		<div class="flex w-full justify-between p-3 px-4">
			<button
				onclick={() => {
					selectedSearchResultData = null;
					selectedSearchId = null;
				}}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>
		{#await promise()}
			<!-- ローディング中 -->
			<div class="flex h-full w-full flex-col items-center justify-center gap-4">
				<div
					class="border-t-accent h-12 w-12 animate-spin rounded-full border-4 border-gray-300"
				></div>
				<p class="text-gray-400">読み込み中...</p>
			</div>
		{:then wikiMenuData}
			<div
				in:fade={{ duration: 100 }}
				class="c-scroll h-full overflow-x-hidden overflow-y-auto pl-2"
			>
				<!-- 画像 -->
				<div class="b relative w-full p-2">
					{#if wikiMenuData}
						{#if wikiMenuData.thumbnail && wikiMenuData.thumbnail.source}
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
					{/if}

					<div
						class="bottom-0 left-0 flex h-full w-full shrink-0 grow flex-col justify-end gap-1 pt-4 text-base"
					>
						<!-- poiタイトル -->
						<span class="text-[22px] font-bold"
							>{wikiMenuData ? wikiMenuData.title : selectedSearchResultData.name}</span
						>
						<span class="text-[14px] text-gray-300"
							>{wikiMenuData ? wikiMenuData.prefecture : selectedSearchResultData.location}</span
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
									{#if wikiMenuData && wikiMenuData.coordinates}
										{wikiMenuData.coordinates?.lat.toFixed(6)}, {wikiMenuData.coordinates?.lon.toFixed(
											6
										)}
									{:else}
										{selectedSearchResultData.point[1].toFixed(6)}, {selectedSearchResultData.point[0].toFixed(
											6
										)}
									{/if}
								</span>
							</div>
						</div>

						<!-- 概要説明 -->
						{#if wikiMenuData}
							<span class="my-2 text-justify text-base">{wikiMenuData.extract}</span>
							<div class="flex w-full items-center justify-center">
								<a
									class="c-btn-confirm mt-4 flex items-center justify-start gap-2 rounded-full p-2 px-4 select-none"
									href={wikiMenuData.url}
									target="_blank"
									rel="noopener noreferrer"
									><Icon icon="majesticons:open" class="h-6 w-6" />
									<span>Wikipediaを見る</span></a
								>
							</div>
						{/if}
					</div>

					<!-- 通常の地物の属性情報 -->
				</div>
			</div>
		{/await}
	</div>
{/if}

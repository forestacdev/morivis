<script lang="ts">
	import type { map } from 'es-toolkit/compat';

	import Icon from '@iconify/svelte';
	import Fuse from 'fuse.js';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import type { Marker, LngLat } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { slide, fly } from 'svelte/transition';

	import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
	import { DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/map/data';
	import { propData } from '$routes/map/data/prop_data';
	import type { GeoDataEntry } from '$routes/map/data/types';

	import { mapStore } from '$routes/stores/map';
	import { isProcessing, showSearchMenu, showSearchSuggest } from '$routes/stores/ui';
	import { type FeatureMenuData } from '$routes/map/types';
	import { getPropertiesFromPMTiles } from '$routes/map/utils/pmtiles';
	import type { ResultData, ResultPoiData } from '$routes/map/utils/feature';
	import { debounce } from 'es-toolkit';
	import { lonLatToTileCoords } from '$routes/map/utils/tile';
	import { detectCoordinateOrder } from './search';
	import maplibregl from 'maplibre-gl';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import { isStyleEdit, selectedLayerId } from '$routes/stores';
	import { activeLayerIdsStore } from '$routes/stores/layers';

	interface Props {
		layerEntries: GeoDataEntry[];
		inputSearchWord: string;
		featureMenuData: FeatureMenuData | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
		searchSuggests: ResultData[] | null;
		focusFeature: (result: ResultData) => void;
		showDataEntry: GeoDataEntry | null;
	}

	let {
		layerEntries,
		featureMenuData = $bindable(),
		inputSearchWord = $bindable(),
		showSelectionMarker = $bindable(),
		selectionMarkerLngLat = $bindable(),
		searchSuggests = $bindable(),
		focusFeature,
		showDataEntry = $bindable()
	}: Props = $props();

	interface SearchData {
		layer_id: string;
		name: string;
		search_values: string[];
		feature_id: number;
		point: [number, number];
		prop_id?: string | null;
		path: string;
	}

	let searchData: SearchData[]; // 検索データ
	let isClickedSearch = $state<boolean>(false);

	const LIMIT = 50; // 検索結果の表示上限
	const dict: Record<string, string> = {}; // レイヤーIDとレイヤー名の辞書

	let featureDataFuse: Fuse<SearchData>;

	onMount(async () => {
		// 検索データの初期化
		searchData = await fetch(`${DATA_PATH}/search_data.json`)
			.then((res) => res.json())
			.then((data) => {
				return data;
			})
			.catch((error) => {
				console.error('Error fetching search data:', error);
			});

		featureDataFuse = new Fuse(searchData, {
			keys: ['search_values'],
			threshold: 0.1
		});

		searchData.forEach((data) => {
			const layerId = data.layer_id;

			// TODO: location名
			const location = '森林文化アカデミー';
			if (location) {
				// レイヤー名が存在する場合のみ辞書に追加
				dict[layerId] = location;
			}
		});
	});

	let isLoading = $state<boolean>(false);

	const layerDataFuse = new Fuse(geoDataEntries, {
		keys: ['metaData.name', 'metaData.tags', 'metaData.location', 'metaData.attribution'],
		threshold: 0.3
	});

	const suggestWord = (searchWord: string) => {
		if (!searchWord) {
			return;
		}
		isLoading = true;

		isClickedSearch = true;
		try {
			if (!searchData) {
				console.error('Search data is not loaded yet.');
				return;
			}

			// TODO:座標検索
			const coordinateInfo = detectCoordinateOrder(searchWord);

			if (coordinateInfo.isCoordinate) {
				let point: [number, number];

				if (coordinateInfo.order === 'lng_lat') {
					point = [coordinateInfo.lng, coordinateInfo.lat] as [number, number];
				} else if (coordinateInfo.order === 'lat_lng') {
					point = [coordinateInfo.lat, coordinateInfo.lng] as [number, number];
				}

				searchSuggests = [
					{
						type: 'coordinate',
						name: searchWord,
						point: point
					}
				];
				return;
			}

			// 検索実行
			const featureDataResult = featureDataFuse.search(searchWord, {
				limit: 10
			});

			const resultsData = featureDataResult.map((item) => {
				const data = item.item;

				return {
					type: 'poi',
					name: data.name,
					location: dict[data.layer_id] || null,
					point: data.point,
					layerId: data.layer_id,
					featureId: data.feature_id,
					propId: data.prop_id
				};
			});

			const layerDataResult = layerDataFuse.search(searchWord, {
				limit: 10
			});

			const layerResultsData = layerDataResult.map((item) => {
				const data = item.item;

				console.log('layer search data:', data);

				return {
					type: 'layer' as const,
					name: data.metaData.name,
					layerId: data.id,
					location: data.metaData.location || '---',
					data: data
				};
			});

			searchSuggests = [...resultsData, ...layerResultsData];
		} catch (error) {
			console.error('Error searching features:', error);
		} finally {
			isLoading = false;
		}
	};

	const searchWards = ['アカデミー施設', '自力建設', '演習林'];

	$effect(() => {
		if (inputSearchWord) {
			suggestWord(inputSearchWord);
			$showSearchSuggest = true;
		} else {
			$showSearchSuggest = false;
		}
	});

	showSearchMenu.subscribe((show) => {
		if (!show) {
			$showSearchSuggest = false;
		}
	});

	// $effect(() => {
	// 	if (inputSearchWord) {
	// 		debounceSearch(inputSearchWord);
	// 	} else {
	// 		results = null;
	// 	}
	// });

	// let containerRef = $state<HTMLElement>();

	// $effect(() => {
	// 	const handleClickOutside = (event: MouseEvent) => {
	// 		if ($showSearchMenu && containerRef && !containerRef.contains(event.target as Node)) {
	// 			$showSearchMenu = false;
	// 		}
	// 	};

	// 	if ($showSearchMenu) {
	// 		document.addEventListener('click', handleClickOutside);
	// 	}

	// 	return () => {
	// 		document.removeEventListener('click', handleClickOutside);
	// 	};
	// });
</script>

{#if $showSearchSuggest && searchSuggests && searchSuggests.length > 0}
	<div
		transition:fly={{ duration: 200, y: -10, opacity: 0, delay: 100 }}
		class="pointer-events-auto flex max-h-[calc(100dvh-300px)] w-full flex-col gap-2 rounded-lg bg-black/80"
	>
		{#if isLoading}
			<div class="flex w-full items-center justify-center">
				<div
					class="h-16 w-16 animate-spin cursor-pointer rounded-full border-4 border-white border-t-transparent"
				></div>
			</div>
		{:else if searchSuggests}
			<div
				class="c-scroll-hidden flex grow flex-col divide-y-2 divide-gray-600 overflow-y-auto overflow-x-hidden px-2"
			>
				{#if searchSuggests.some((result) => result.type === 'poi' || result.type === 'coordinate')}
					<div class="p-2 pt-3 text-white">場所検索</div>
					{#each searchSuggests as result (result)}
						{#if result.type === 'poi'}
							<button
								onclick={() => {
									$showSearchSuggest = false;
									focusFeature(result);
								}}
								class="flex w-full cursor-pointer items-center justify-center gap-2 p-2 text-left text-base"
							>
								<div class="grid shrink-0 place-items-center">
									{#if result.propId && propData[result.propId] && propData[result.propId].image}
										<img
											src={propData[result.propId].image}
											alt="Icon"
											class="h-12 w-12 rounded-full object-cover"
										/>
									{:else}
										<div class="grid h-12 w-12 place-items-center">
											<Icon icon="lucide:map-pin" class="h-8 w-8 shrink-0 text-base" />
										</div>
									{/if}
								</div>
								<div class="flex w-full flex-col justify-center gap-[1px]">
									<span class="">{result.name}</span>
									<span class="text-xs">{result.location ?? '---'}</span>
								</div>
							</button>
						{/if}
						{#if result.type === 'coordinate'}
							<button
								onclick={() => {
									$showSearchSuggest = false;
									focusFeature(result);
								}}
								class="flex w-full cursor-pointer items-center justify-center gap-2 p-2 text-left text-base"
							>
								<div class="grid shrink-0 place-items-center">
									<Icon icon="mdi:crosshairs-gps" class="h-8 w-8 shrink-0 text-base" />
								</div>
								<div class="flex w-full flex-col justify-center gap-[1px]">
									<span class="">{result.name}</span>
									<span class="text-xs">座標</span>
								</div>
							</button>
						{/if}
					{/each}
				{/if}
				{#if searchSuggests.some((result) => result.type === 'layer')}
					<div class="p-2 pt-3 text-white">データ検索</div>
					{#each searchSuggests as result (result)}
						{#if result.type === 'layer'}
							<button
								onclick={() => {
									$showSearchSuggest = false;
									if ($activeLayerIdsStore.includes(result.layerId)) {
										selectedLayerId.set(result.layerId);
										isStyleEdit.set(true);
									} else {
										showDataEntry = result.data;
									}
								}}
								class="flex w-full cursor-pointer items-center justify-center gap-2 p-2 text-left text-base"
							>
								<div
									class="relative isolate grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-black text-base transition-transform duration-150"
								>
									<div class="scale-200 h-full w-full">
										<LayerIcon layerEntry={result.data} />
									</div>
								</div>
								<div class="flex w-full flex-col justify-center gap-[1px]">
									<span class="">{result.name}</span>
									<span class="text-xs">{result.location ?? '---'}</span>
								</div>
							</button>
						{/if}
					{/each}
				{/if}
			</div>
		{/if}
	</div>
{/if}

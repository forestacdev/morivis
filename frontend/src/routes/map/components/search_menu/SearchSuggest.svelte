<script lang="ts">
	import Icon from '@iconify/svelte';
	import Fuse from 'fuse.js';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import type { Marker, LngLat } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { slide, fly } from 'svelte/transition';

	import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
	import { DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/map/data';
	import { addressSearch, addressCodeToAddress } from '$routes/map/api/address';
	import { propData } from '$routes/map/data/prop_data';
	import type { GeoDataEntry } from '$routes/map/data/types';

	import { mapStore } from '$routes/stores/map';
	import { isProcessing, showSearchMenu, showSearchSuggest } from '$routes/stores/ui';
	import { type FeatureMenuData } from '$routes/map/types';
	import { getPropertiesFromPMTiles } from '$routes/map/utils/pmtiles';
	import type { ResultData } from '$routes/map/utils/feature';
	import { debounce } from 'es-toolkit';
	import { lonLatToTileCoords } from '$routes/map/utils/tile';
	import { detectCoordinateOrder } from './search';

	interface Props {
		layerEntries: GeoDataEntry[];
		inputSearchWord: string;
		featureMenuData: FeatureMenuData | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
	}

	let {
		layerEntries,
		featureMenuData = $bindable(),
		inputSearchWord = $bindable(),
		showSelectionMarker = $bindable(),
		selectionMarkerLngLat = $bindable()
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

		searchData.forEach((data) => {
			const layerId = data.layer_id;

			// TODO: location
			const location = '森林文化アカデミー';
			if (location) {
				// レイヤー名が存在する場合のみ辞書に追加
				dict[layerId] = location;
			}
		});
	});

	let results = $state<ResultData[] | null>([]);
	let isLoading = $state<boolean>(false);

	const focusFeature = async (result: ResultData) => {
		inputSearchWord = result.name;
		if (result.propId) {
			const tileCoords = lonLatToTileCoords(
				result.point[0],
				result.point[1],
				14 // ズームレベル
			);
			const prop = await getPropertiesFromPMTiles(
				`${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`,
				tileCoords,
				result.layerId,
				result.featureId
			);

			const data: FeatureMenuData = {
				layerId: result.layerId,
				properties: prop,
				point: result.point,
				featureId: result.featureId
			};
			featureMenuData = data;
		}

		// TODO
		//github.com/maplibre/maplibre-gl-js/issues/4891
		mapStore.easeTo({
			center: result.point,
			zoom: 17
		});

		selectionMarkerLngLat = result.point;
		showSelectionMarker = true;
		showSearchSuggest.set(false);
	};

	const suggestWord = (searchWord: string) => {
		if (!searchWord) {
			results = null;
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
			// const hoge = detectCoordinateOrder(searchWord);
			// console.log('hoge', hoge);
			// if (hoge.isCoordinate) {
			// 	const point = [hoge.lat, hoge.lng];
			// 	const map = mapStore.getMap();
			// 	map?.panTo([point[1], point[0]]);
			// 	results = [
			// 		{
			// 			name: searchWord,
			// 			location: null,
			// 			point: point,
			// 			layerId: null,
			// 			featureId: null
			// 		}
			// 	];
			// 	return;
			// }

			const fuse = new Fuse(searchData, {
				keys: ['search_values'],
				threshold: 0.1
			});
			// 検索実行
			const result = fuse.search(searchWord, {
				limit: LIMIT
			});

			const resultsData = result.map((item) => {
				const data = item.item;

				return {
					name: data.name,
					location: dict[data.layer_id] || null,
					point: data.point,
					layerId: data.layer_id,
					featureId: data.feature_id,
					propId: data.prop_id
				};
			});

			results = [...resultsData];
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
		} else {
			results = null;
		}
	});

	showSearchMenu.subscribe((show) => {
		if (!show) {
			results = null;
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

<!-- レイヤーメニュー -->
{#if $showSearchSuggest && !$showSearchMenu && results && results.length > 0}
	<div class="pointer-events-none absolute z-10 flex w-full justify-end pr-[20px] pt-[80px]">
		<div
			transition:fly={{ duration: 200, y: 10, opacity: 0, delay: 100 }}
			class="w-side-menu pointer-events-auto flex max-h-[calc(100dvh-300px)] flex-col gap-2 rounded-lg bg-black/80"
		>
			{#if isLoading}
				<div class="flex w-full items-center justify-center">
					<div
						class="h-16 w-16 animate-spin cursor-pointer rounded-full border-4 border-white border-t-transparent"
					></div>
				</div>
			{:else if results}
				<div
					class="c-scroll-hidden flex grow flex-col divide-y-2 divide-gray-600 overflow-y-auto overflow-x-hidden px-2"
				>
					{#each results as result (result)}
						<button
							onclick={() => focusFeature(result)}
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
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

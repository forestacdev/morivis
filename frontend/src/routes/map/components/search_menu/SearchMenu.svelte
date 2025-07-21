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
	import { isSideMenuType } from '$routes/stores/ui';
	import { type FeatureMenuData } from '$routes/map/types';
	import { getPropertiesFromPMTiles } from '$routes/map/utils/pmtiles';
	import type { ResultData } from '$routes/map/utils/feature';
	import { debounce } from 'es-toolkit';
	import { lonLatToTileCoords } from '$routes/map/utils/tile';
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

	const LIMIT = 100; // 検索結果の表示上限
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

		mapStore.easeTo({
			center: result.point,
			zoom: 17,
			padding: { left: 400 }
		});

		selectionMarkerLngLat = result.point;
		showSelectionMarker = true;
	};

	const searchFeature = async (searchWord: string, isAddressSearch: boolean = true) => {
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

			let addressSearchData = [];

			// 2文字以上の検索ワードの場合、住所検索を実行
			if (searchWord.length > 1 && isAddressSearch) {
				// 住所検索

				const addressSearchResponse = await addressSearch(searchWord);

				addressSearchData = addressSearchResponse
					.slice(0, LIMIT - result.length)
					.map(({ geometry: { coordinates: center }, properties }) => {
						const address = properties.addressCode
							? addressCodeToAddress(properties.addressCode)
							: null;

						return {
							point: center,
							name: properties.title,
							location: address
						};
					});
			}

			results = [...resultsData, ...addressSearchData];
		} catch (error) {
			console.error('Error searching features:', error);
		} finally {
			isLoading = false;
		}
	};

	const searchWards = ['アカデミー施設', '自力建設', '演習林'];

	const debounceSearch = debounce((searchWord: string) => {
		if (isClickedSearch) {
			isClickedSearch = false;
			return;
		}
		if (!searchWord) {
			results = null;
			return;
		}
		searchFeature(searchWord);
	}, 500);

	$effect(() => {
		if (inputSearchWord) {
			debounceSearch(inputSearchWord);
		} else {
			results = null;
		}
	});

	$effect(() => {
		if (inputSearchWord) {
			debounceSearch(inputSearchWord);
		} else {
			results = null;
		}
	});
</script>

<!-- レイヤーメニュー -->
{#if $isSideMenuType === 'search'}
	<div
		transition:fly={{ duration: 200, x: -100, opacity: 0, delay: 100 }}
		class="w-side-menu bg-main absolute z-10 flex h-full flex-col gap-2 pt-[70px]"
	>
		{#if isLoading}
			<div class="flex w-full items-center justify-center">
				<div
					class="h-16 w-16 animate-spin cursor-pointer rounded-full border-4 border-white border-t-transparent"
				></div>
			</div>
		{:else if !results}
			<div
				class="c-scroll-hidden flex grow flex-col gap-4 overflow-y-auto overflow-x-hidden p-2 pb-4"
			>
				{#each searchWards as searchWard (searchWard)}
					<button
						class="cursor-pointer rounded-lg bg-black px-4 py-2 text-base drop-shadow-[0_0_2px_rgba(220,220,220,0.8)]"
						onclick={() => {
							inputSearchWord = searchWard;
							searchFeature(inputSearchWord, false);
						}}
						>{searchWard}
					</button>
				{/each}
			</div>
		{:else if results && results.length === 0}
			<div class="flex h-full w-full items-center justify-center">
				<div class="flex flex-col items-center gap-4">
					<Icon icon="streamline:sad-face" class="h-16 w-16 text-gray-500 opacity-95" />
					<span class="text-2xl text-gray-500">データが見つかりません</span>
				</div>
			</div>
		{:else if results}
			<div
				class="c-scroll-hidden flex grow flex-col divide-y-2 divide-gray-600 overflow-y-auto overflow-x-hidden px-2 pb-4"
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
				<div class="h-[200px] w-full shrink-0"></div>
			</div>
		{/if}
		<!-- <div
			class="c-fog pointer-events-none absolute bottom-0 z-10 flex h-[100px] w-full items-end justify-center pb-4"
		></div> -->
	</div>
{/if}

<script lang="ts">
	import Icon from '@iconify/svelte';
	import Fuse from 'fuse.js';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import type { Marker, LngLat } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { slide, fly } from 'svelte/transition';

	import Geocoder from '$routes/components/search-menu/Geocoder.svelte';
	import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
	import { DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/data';
	import { addressSearch, addressCodeToAddress } from '$routes/data/api';
	import { propData } from '$routes/data/propData';
	import type { GeoDataEntry } from '$routes/data/types';
	import { showSearchMenu } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { isSideMenuType } from '$routes/store/ui';
	import { type FeatureMenuData, type ClickedLayerFeaturesData } from '$routes/utils/file/geojson';
	import { getPropertiesFromPMTiles } from '$routes/utils/pmtiles';
	import type { ResultData } from '$routes/utils/feature';
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
		tile_coords: {
			x: number;
			y: number;
			z: number;
		};
		prop_id?: string | null;
		path: string;
	}

	let searchData: SearchData[]; // 検索データ

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

			const layer = geoDataEntries.find((entry) => entry.id === layerId);
			const location = layer ? layer.metaData.location : null;
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
			const prop = await getPropertiesFromPMTiles(
				`${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`,
				result.tile,
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

	const searchFeature = async (searchWord: string) => {
		isLoading = true;
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

					tile: data.tile_coords,
					point: data.point,
					layerId: data.layer_id,
					featureId: data.feature_id,
					propId: data.prop_id
				};
			});

			let addressSearchData = [];

			// 2文字以上の検索ワードの場合、住所検索を実行
			if (searchWord.length > 1) {
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
</script>

<!-- レイヤーメニュー -->
{#if $isSideMenuType === 'search'}
	<div
		transition:fly={{ duration: 300, y: 100, opacity: 0, delay: 100 }}
		class="w-side-menu absolute z-10 flex h-full flex-col gap-2 pt-[70px]"
	>
		<!-- <div class="flex items-center justify-between p-2">
			<Geocoder
				{layerEntries}
				bind:results
				bind:inputSearchWord
				searchFeature={(v) => searchFeature(v)}
			/>
		</div> -->

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
				{#each searchWards as searchWard}
					<button
						class="bg-main cursor-pointer rounded-full px-4 py-2 text-base drop-shadow-[0_0_2px_rgba(220,220,220,0.8)]"
						onclick={() => {
							inputSearchWord = searchWard;
							searchFeature(inputSearchWord);
						}}
						>{searchWard}
					</button>
				{/each}
			</div>
		{:else if results && results.length === 0}
			<div class="flex w-full items-center justify-center">
				<span class="text-white">データが見つかりません</span>
			</div>
		{:else if results}
			<div
				class="c-scroll-hidden flex grow flex-col divide-y-2 divide-gray-600 overflow-y-auto overflow-x-hidden px-2 pb-4"
			>
				{#each results as result}
					<button
						onclick={() => focusFeature(result)}
						class="flex w-full cursor-pointer items-center justify-center gap-2 p-2 text-left text-base"
					>
						<div class="grid shrink-0 place-items-center">
							{#if result.propId && propData[result.propId]}
								<img
									src={propData[result.propId].image}
									alt="Icon"
									class="h-8 w-8 rounded-full object-cover"
								/>
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

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(0deg, rgb(0, 93, 3) 10%, rgba(233, 233, 233, 0) 100%);
	}
</style>

<script lang="ts">
	import Icon from '@iconify/svelte';

	import type { LngLat } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
	import { DATA_PATH } from '$routes/constants';

	import { propData } from '$routes/map/data/prop_data';
	import type { GeoDataEntry } from '$routes/map/data/types';

	import { mapStore } from '$routes/stores/map';
	import { showDataMenu, showSearchMenu } from '$routes/stores/ui';
	import { type FeatureMenuData } from '$routes/map/types';
	import { getPropertiesFromPMTiles } from '$routes/map/utils/pmtiles';
	import type { ResultData } from '$routes/map/utils/feature';
	import { lonLatToTileCoords } from '$routes/map/utils/tile';
	import turfBbox from '@turf/bbox';
	import { isStyleEdit } from '$routes/stores';
	interface Props {
		layerEntries: GeoDataEntry[];
		inputSearchWord: string;
		featureMenuData: FeatureMenuData | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
		results: ResultData[] | null;
	}

	let {
		layerEntries,
		featureMenuData = $bindable(),
		inputSearchWord = $bindable(),
		showSelectionMarker = $bindable(),
		selectionMarkerLngLat = $bindable(),
		results = $bindable()
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

		// TODO
		//github.com/maplibre/maplibre-gl-js/issues/4891
		mapStore.easeTo({
			center: result.point,
			zoom: 17
		});

		selectionMarkerLngLat = result.point;
		showSelectionMarker = true;
	};

	const closeSearchMenu = () => {
		$showSearchMenu = false;
		results = null;
		mapStore.setData('search_result', {
			type: 'FeatureCollection',
			features: []
		});
	};

	$effect(() => {
		if (results && results.length > 0) {
			const geojson = {
				type: 'FeatureCollection',
				features: results.map((result) => ({
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: result.point
					},
					properties: {
						name: result.name,
						location: result.location,
						layerId: result.layerId,
						featureId: result.featureId,
						propId: result.propId
					}
				}))
			};
			mapStore.setData('search_result', geojson);

			const bbox = turfBbox(geojson);
			mapStore.fitBounds(bbox, {
				duration: 500,
				padding: 20
			});
		} else {
			closeSearchMenu();
		}
	});

	showSearchMenu.subscribe((show) => {
		if (!show) {
			closeSearchMenu();
		}
	});
	showDataMenu.subscribe((show) => {
		if (show) {
			closeSearchMenu();
		}
	});
	isStyleEdit.subscribe((show) => {
		if (show) {
			closeSearchMenu();
		}
	});
</script>

<!-- レイヤーメニュー -->
{#if $showSearchMenu}
	<div
		transition:fly={{ duration: 200, x: -100, opacity: 0, delay: 100 }}
		class="w-side-menu bg-main absolute z-10 flex h-full flex-col gap-2"
	>
		<div class="flex w-full items-center p-4 text-base">
			<span class="text-2xl">検索結果</span>
			<button
				onclick={closeSearchMenu}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>
		{#if results}
			<div
				class="c-scroll flex grow flex-col divide-y-2 divide-gray-600 overflow-y-auto overflow-x-hidden px-2 pb-4"
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

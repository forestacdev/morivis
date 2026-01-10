<script lang="ts">
	import Icon from '@iconify/svelte';
	import turfBbox from '@turf/bbox';
	import type { LngLat } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	import { ICON_IMAGE_BASE_PATH } from '$routes/constants';
	import { DATA_PATH } from '$routes/constants';
	import { propData } from '$routes/map/data/prop_data';
	import { type FeatureMenuData } from '$routes/map/types';
	import type {
		ResultData,
		ResultPoiData,
		ResultAddressData,
		SearchGeojsonData
	} from '$routes/map/utils/feature';
	import { isStyleEdit } from '$routes/stores';
	import { mapStore } from '$routes/stores/map';
	import { showDataMenu, showSearchMenu, showSearchSuggest } from '$routes/stores/ui';
	interface Props {
		inputSearchWord: string;
		featureMenuData: FeatureMenuData | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
		searchResults: ResultData[] | null;
		searchGeojsonData: SearchGeojsonData | null;
		selectedSearchId: number | null;
		focusFeature: (result: ResultData) => void;
	}

	let {
		featureMenuData = $bindable(),
		inputSearchWord = $bindable(),
		showSelectionMarker = $bindable(),
		selectionMarkerLngLat = $bindable(),
		searchResults = $bindable(),
		searchGeojsonData = $bindable(),
		selectedSearchId = $bindable(),
		focusFeature
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

	const closeSearchMenu = () => {
		$showSearchMenu = false;
		searchResults = null;
		searchGeojsonData = null;
	};

	$effect(() => {
		if (searchResults && searchResults.length > 0) {
			const geojson: SearchGeojsonData = {
				type: 'FeatureCollection',
				features: searchResults
					.filter(
						(result): result is ResultPoiData | ResultAddressData =>
							result.type === 'poi' || result.type === 'address'
					)
					.map((result) => ({
						id: result.id,
						type: 'Feature' as const,
						geometry: {
							type: 'Point' as const,
							coordinates: result.point as [number, number]
						},
						properties: result
					}))
			};
			searchGeojsonData = geojson;
			// mapStore.setData('search_result', geojson);

			const bbox = turfBbox(geojson);
			mapStore.fitBounds(bbox as [number, number, number, number], {
				duration: 500,
				padding: 100
			});
			showSearchSuggest.set(false);
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

	$effect(() => {
		if (showSelectionMarker) {
			showSearchSuggest.set(false);
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
		{#if searchResults}
			<div class="c-scroll flex grow flex-col gap-3 overflow-x-hidden overflow-y-auto px-2 pb-4">
				{#each searchResults as result (result)}
					<button
						onclick={() => focusFeature(result)}
						class="border-sub flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-1 bg-black p-2 text-left text-base {result.id &&
						selectedSearchId === result.id
							? 'bg-accent'
							: ''}"
					>
						{#if result.type === 'poi'}
							<div class="grid shrink-0 place-items-center overflow-hidden">
								{#if result.propId && propData[result.propId] && propData[result.propId].image}
									<img
										src={`${ICON_IMAGE_BASE_PATH}/${result.propId}.webp`}
										alt="Icon"
										class="h-12 w-12 rounded-full object-cover"
									/>
								{:else}
									<div class="grid h-12 w-12 place-items-center">
										<Icon icon="lucide:map-pin" class="h-8 w-8 shrink-0 text-base" />
									</div>
								{/if}
							</div>
							<div class="flex w-full flex-col justify-center gap-[1px] overflow-hidden">
								<span class="truncate">{result.name}</span>
								<span class="text-xs text-gray-400">{result.location ?? '---'}</span>
							</div>
						{:else if result.type === 'address'}
							<div class="grid shrink-0 place-items-center overflow-hidden">
								<div class="grid h-12 w-12 place-items-center">
									<Icon icon="lucide:map-pin" class="h-8 w-8 shrink-0 text-base" />
								</div>
							</div>
							<div class="flex w-full flex-col justify-center gap-[1px] overflow-hidden">
								<span class="truncate">{result.name}</span>
								<span class="text-xs text-gray-400">{result.location ?? '---'}</span>
							</div>
						{/if}
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

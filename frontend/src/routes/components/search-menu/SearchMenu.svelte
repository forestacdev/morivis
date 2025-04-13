<script lang="ts">
	import Icon from '@iconify/svelte';
	import Fuse from 'fuse.js';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { slide, fly } from 'svelte/transition';

	import Geocoder from '$routes/components/search-menu/Geocoder.svelte';
	import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
	import { DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/data';
	import { addressSearch, addressCodeToAddress } from '$routes/data/api';
	import { propData } from '$routes/data/propData';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, isEdit, mapMode, showSearchMenu } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import type { ResultData } from '$routes/utils/feature';
	import { type FeatureMenuData, type ClickedLayerFeaturesData } from '$routes/utils/geojson';
	import { getPropertiesFromPMTiles } from '$routes/utils/pmtiles';
	interface Props {
		layerEntries: GeoDataEntry[];
		inputSearchWord: string;
		featureMenuData: FeatureMenuData | null;
	}

	let {
		layerEntries,
		featureMenuData = $bindable(),
		inputSearchWord = $bindable()
	}: Props = $props();

	let searchData: any = null; // 検索データ

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
			zoom: 17
		});
	};

	const searchFeature = async (searchWord: string) => {
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

		let addressSearchResponse = await addressSearch(searchWord);

		const addressSearchData = addressSearchResponse
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

		results = [...resultsData, ...addressSearchData];
	};
</script>

<!-- レイヤーメニュー -->
{#if $showSearchMenu}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute z-10 flex h-full w-[400px] flex-col gap-2"
	>
		<div class="flex items-center justify-between p-2">
			<Geocoder
				{layerEntries}
				bind:results
				bind:inputSearchWord
				searchFeature={(v) => searchFeature(v)}
			></Geocoder>
			<button
				onclick={() => {
					showSearchMenu.set(false);
				}}
				class="bg-base rounded-full p-2"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
		</div>

		<div
			class="c-scroll-hidden flex flex-grow flex-col divide-y-2 divide-gray-400 overflow-y-auto overflow-x-hidden px-2 pb-4"
		>
			{#if !results}
				<button
					class="flex w-full items-center justify-center gap-2 p-2 text-left text-base"
					onclick={() => {
						inputSearchWord = '自力建設';
						searchFeature(inputSearchWord);
					}}
					>自力建設
				</button>
			{/if}
			{#if results}
				{#each results as result}
					<button
						onclick={() => focusFeature(result)}
						class="flex w-full items-center justify-center gap-2 p-2 text-left text-base"
					>
						<div class="grid flex-shrink-0 place-items-center">
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
			{/if}
			<div class="h-[200px] w-full flex-shrink-0"></div>
		</div>
		<div
			class="c-fog pointer-events-none absolute bottom-0 z-10 flex h-[100px] w-full items-end justify-center pb-4"
		></div>
	</div>
{/if}

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(0deg, rgb(0, 93, 3) 10%, rgba(233, 233, 233, 0) 100%);
	}
</style>

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';

	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';
	import StreetViewControl from '$routes/map/components/map_control/StreetViewControl.svelte';
	import {
		showSideMenu,
		mapMode,
		showInfoDialog,
		showTermsDialog,
		showTerrainMenu,
		selectedLayerId,
		isStyleEdit,
		showDataMenu,
		isStreetView
	} from '$routes/stores';
	import { isSideMenuType, showSearchMenu } from '$routes/stores/ui';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import type { LngLat } from 'maplibre-gl';

	import Geocoder from '$routes/map/components/search_menu/Geocoder.svelte';
	import type { ResultData } from '$routes/map/utils/feature';
	import { addressSearch, addressCodeToAddress } from '$routes/map/api/address';
	import Fuse from 'fuse.js';
	import { DATA_PATH } from '$routes/constants';
	import { onMount } from 'svelte';

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

	const LIMIT = 100; // 検索結果の表示上限
	const dict: Record<string, string> = {}; // レイヤーIDとレイヤー名の辞書
	let isLoading = $state<boolean>(false);

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
			if (results && results.length > 0) {
				showSearchMenu.set(true);
			}
		}
	};

	mapMode.subscribe((mode) => {
		showSideMenu.set(false);
	});

	const toggleSearchMenu = () => {
		showSearchMenu.set(true);
	};
</script>

<div class="bg-main flex items-center justify-between p-2 pb-4 text-base">
	<!-- 左側 -->
	<div class="flex items-center gap-4 pl-1">
		<button class="hover:text-accent cursor-pointer text-left duration-150">
			<Icon icon="ic:round-layers" class="h-10 w-10" />
		</button>
		<div class="flex select-none items-center justify-center">
			<span class="-translate-y-1 text-4xl">morivis</span>
		</div>
		<button
			onclick={() => showDataMenu.set(true)}
			class="bg-accent pointer-events-auto flex shrink cursor-pointer items-center justify-center gap-2 rounded-full p-1 pl-2 pr-4"
		>
			<Icon icon="material-symbols:add" class="h-7 w-7" /><span>データ追加</span>
		</button>
	</div>
	<!-- 中央 -->
	<div class="relative flex max-w-[400px] flex-1 items-center justify-between overflow-hidden">
		<Geocoder
			{layerEntries}
			bind:results
			bind:inputSearchWord
			searchFeature={(v) => searchFeature(v)}
		/>
		<button
			transition:slide={{ duration: 300, axis: 'x' }}
			onclick={toggleSearchMenu}
			class="bg-sub flex items-center justify-start gap-2 rounded-r-full p-2 text-white"
		>
			<Icon icon="stash:search-solid" class="h-6 w-6" />
		</button>
	</div>

	<!-- 右側 -->
	<div class="flex items-center">
		<StreetViewControl />
		<!-- <TerrainControl /> -->
		<GeolocateControl />
		<!-- ハンバーガーメニュー -->
		<button
			class="hover:text-accent cursor-pointer p-2 text-left duration-150"
			onclick={() => showSideMenu.set(true)}
		>
			<Icon icon="ic:round-menu" class="h-7 w-7" />
		</button>
	</div>
</div>

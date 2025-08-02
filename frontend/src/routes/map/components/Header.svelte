<script lang="ts">
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';

	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';
	import StreetViewControl from '$routes/map/components/map_control/StreetViewControl.svelte';
	import TerrainControl from '$routes/map/components/map_control/TerrainControl.svelte';
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
	import { isProcessing, showLayerMenu, showSearchMenu } from '$routes/stores/ui';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { type LngLat } from 'maplibre-gl';

	import Geocoder from '$routes/map/components/search_menu/Geocoder.svelte';
	import type { ResultData } from '$routes/map/utils/feature';
	import { addressSearch, addressCodeToAddress } from '$routes/map/api/address';
	import Fuse from 'fuse.js';
	import { DATA_PATH } from '$routes/constants';
	import { onMount } from 'svelte';
	import { resetLayersConfirm } from '$routes/stores/confirmation';
	import { showNotification } from '$routes/stores/notification';

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
		resetlayerEntries: () => void; // レイヤーのリセット関数
	}

	let {
		layerEntries,
		featureMenuData = $bindable(),
		inputSearchWord = $bindable(),
		showSelectionMarker = $bindable(),
		selectionMarkerLngLat = $bindable(),
		results = $bindable(),
		resetlayerEntries
	}: Props = $props();

	const searchFeature = async (searchWord: string) => {
		isLoading = true;
		isProcessing.set(true);
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
			isProcessing.set(false);
			if (results && results.length > 0) {
				showSearchMenu.set(true);
			} else {
				showSearchMenu.set(false);
				showNotification('該当するデータが見つかりませんでした。', 'info');
			}
		}
	};

	mapMode.subscribe((mode) => {
		showSideMenu.set(false);
	});

	// レイヤーのリセット処理
	const resetLayers = async () => {
		const result = await resetLayersConfirm();

		if (result) {
			resetlayerEntries();
		}
	};

	let searchContainerRef = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				showSearchForm &&
				searchContainerRef &&
				!searchContainerRef.contains(event.target as Node)
			) {
				showSearchForm = false;
			}
		};

		if (showSearchForm) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	let showSearchForm = $state<boolean>(false);
</script>

<div class="bg-main flex items-center justify-between p-2 pb-6">
	<!-- 左側 -->
	<div class="flex h-full items-center gap-4 pl-2">
		<!-- <button
			class="hover:text-accent bg-base text-main cursor-pointer rounded-full p-1 text-left duration-150"
		>
			<Icon icon="ic:round-layers" class="h-8 w-8" />
		</button> -->
		<div class="flex select-none items-center justify-center text-base">
			<span class="text-5xl">morivis</span>
		</div>
		<div class="flex h-full items-end justify-center gap-2">
			<button
				onclick={() => showDataMenu.set(true)}
				class="c-btn-confirm flex items-center gap-1 rounded-full p-0.5 pl-2 pr-4"
			>
				<Icon icon="material-symbols:add" class="h-7 w-7" /><span class="text-sm">データ追加</span>
			</button>
			<!-- <button
				onclick={resetLayers}
				class="c-btn-sub flex shrink items-center justify-center gap-2 rounded-full p-0.5 px-2"
			>
				<span class="text-sm">リセット</span>
			</button> -->
		</div>
	</div>
	<!-- 中央 -->
	<!-- <div class="relative flex max-w-[400px] flex-1 items-center justify-between overflow-hidden">
		<Geocoder
			{layerEntries}
			bind:results
			bind:inputSearchWord
			searchFeature={(v) => searchFeature(v)}
		/>
		<button
			transition:slide={{ duration: 300, axis: 'x' }}
			onclick={() => searchFeature(inputSearchWord)}
			disabled={$isProcessing || !inputSearchWord}
			class="flex items-center justify-start gap-2 rounded-r-full p-2 px-4 text-white {inputSearchWord
				? 'bg-accent cursor-pointer'
				: 'bg-sub cursor-not-allowed'}"
		>
			<Icon icon="stash:search-solid" class="h-6 w-6" />
		</button>
	</div> -->

	<!-- 右側 -->
	<div class="flex items-center pr-2">
		<div bind:this={searchContainerRef} class="flex items-center">
			{#if showSearchForm}
				<Geocoder
					{layerEntries}
					bind:results
					bind:inputSearchWord
					bind:showSearchForm
					searchFeature={(v) => searchFeature(v)}
				/>
			{/if}
			<button
				onclick={() => {
					if (showSearchForm && inputSearchWord) {
						searchFeature(inputSearchWord);
					} else {
						showSearchForm = true;
					}
				}}
				disabled={$isProcessing}
				class="flex cursor-pointer items-center justify-start gap-2 rounded-r-full p-2 px-4 transition-colors duration-100 {showSearchForm
					? 'bg-base text-gray-700 delay-100'
					: 'text-white'}"
			>
				<Icon
					icon="stash:search-solid"
					class="transition-[width, height] duration-100 {showSearchForm ? 'h-6 w-6' : 'h-8 w-8'}"
				/>
			</button>
		</div>
		<StreetViewControl />
		<TerrainControl />
		<GeolocateControl />
		<!-- ハンバーガーメニュー -->
		<button
			class="hover:text-accent cursor-pointer rounded-full p-2 text-left text-base duration-100"
			onclick={() => showSideMenu.set(true)}
		>
			<Icon icon="ic:round-menu" class="h-8 w-8" />
		</button>
	</div>
</div>

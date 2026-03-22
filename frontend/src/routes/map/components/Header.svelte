<script lang="ts">
	import Icon from '@iconify/svelte';
	import Fuse from 'fuse.js';
	import { type LngLat } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import StreetViewControl from './map_control/StreetViewControl.svelte';
	import SearchSuggest from './search_menu/SearchSuggest.svelte';

	import { DATA_PATH } from '$routes/constants';
	import { addressSearch, addressCodeToAddress } from '$routes/map/api/address';
	import { getPostcodeInfo } from '$routes/map/api/postcode';
	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';
	import GlobeControl from '$routes/map/components/map_control/GlobeControl.svelte';
	import TerrainControl from '$routes/map/components/map_control/TerrainControl.svelte';
	import Geocoder from '$routes/map/components/search_menu/Geocoder.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import type { ResultData, ResultAddressData } from '$routes/map/utils/feature';
	import { mapMode } from '$routes/stores';
	import { resetLayersConfirm } from '$routes/stores/confirmation';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing, showSearchMenu, showOtherMenu, showDataMenu } from '$routes/stores/ui';

	interface Props {
		layerEntries: GeoDataEntry[];
		inputSearchWord: string;
		featureMenuData: FeatureMenuData | null;
		selectedSearchResultData: ResultData | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
		searchResults: ResultData[] | null;
		showDataEntry: GeoDataEntry | null;
		resetlayerEntries: () => void; // レイヤーのリセット関数
		focusFeature: (result: ResultData) => void;
	}

	let {
		layerEntries,
		featureMenuData = $bindable(),
		inputSearchWord = $bindable(),
		showSelectionMarker = $bindable(),
		selectionMarkerLngLat = $bindable(),
		searchResults = $bindable(),
		selectedSearchResultData = $bindable(),
		resetlayerEntries,
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

	const LIMIT = 50; // 検索結果の表示上限
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

	let searchSuggests = $state<ResultData[] | null>(null);

	// 検索処理の実行
	const searchFeature = async (searchWord: string) => {
		// 座標検索の優先処理
		if (searchSuggests && searchSuggests.length > 0 && searchSuggests[0].type === 'coordinate') {
			const data = searchSuggests[0];
			focusFeature(data);

			return;
		}

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
					type: 'poi' as const,
					name: data.name,
					location: dict[data.layer_id] || '---',
					point: data.point,
					layerId: data.layer_id,
					featureId: data.feature_id,
					propId: data.prop_id ?? ''
				};
			});

			let addressSearchData: ResultAddressData[] = [];

			// 郵便番号検索（3〜7桁の数字、ハイフン許可）
			const postcodeMatch = searchWord.match(/^(\d{3})-?(\d{0,4})$/);
			if (postcodeMatch) {
				const code = postcodeMatch[1] + postcodeMatch[2];
				if (code.length === 7) {
					const info = await getPostcodeInfo(code);
					if (info?.location) {
						const name = `〒${postcodeMatch[1]}-${postcodeMatch[2]} ${info.prefecture}${info.city}${info.suburb}`;
						addressSearchData.push({
							type: 'address',
							point: [parseFloat(info.location.longitude), parseFloat(info.location.latitude)],
							name,
							location: `${info.prefecture}${info.city}`
						});
					}
				}
			}

			// 2文字以上の検索ワードの場合、住所検索を実行（郵便番号マッチ時はスキップ）
			if (searchWord.length > 1 && !postcodeMatch) {
				// 住所検索

				const addressSearchResponse = await addressSearch(searchWord);

				if (!addressSearchResponse) {
					throw new Error('住所検索に失敗しました');
				}

				addressSearchData = addressSearchResponse
					.slice(0, LIMIT - result.length)
					.map(({ geometry: { coordinates: center }, properties }) => {
						const address = properties.addressCode
							? addressCodeToAddress(properties.addressCode)
							: '---';

						return {
							type: 'address' as const,
							point: center,
							name: properties.title,
							location: address ?? '---'
						};
					});
			}

			const merged = [...resultsData, ...addressSearchData];

			// 検索ワードが名前の先頭に含まれるものを優先、次に距離順
			const [cLng, cLat] = mapStore.getState().center;
			merged.sort((a, b) => {
				const aPrefix = a.name.startsWith(searchWord) ? 0 : 1;
				const bPrefix = b.name.startsWith(searchWord) ? 0 : 1;
				if (aPrefix !== bPrefix) return aPrefix - bPrefix;

				const pa = 'point' in a ? a.point : null;
				const pb = 'point' in b ? b.point : null;
				if (!pa && !pb) return 0;
				if (!pa) return 1;
				if (!pb) return -1;
				const da = (pa[0] - cLng) ** 2 + (pa[1] - cLat) ** 2;
				const db = (pb[0] - cLng) ** 2 + (pb[1] - cLat) ** 2;
				return da - db;
			});

			searchResults = merged.map((data, i) => ({
				id: i,
				...data
			}));
		} catch (error) {
			console.error('Error searching features:', error);
		} finally {
			isLoading = false;
			isProcessing.set(false);
			if (searchResults && searchResults.length > 0) {
				showSearchMenu.set(true);
				featureMenuData = null;
				selectedSearchResultData = null;
			} else {
				// showSearchMenu.set(false);
				showNotification('該当するデータが見つかりませんでした。', 'info');
			}
		}
	};

	mapMode.subscribe((mode) => {
		showOtherMenu.set(false);
	});

	// レイヤーのリセット処理
	const resetLayers = async () => {
		const result = await resetLayersConfirm();

		if (result) {
			resetlayerEntries();
		}
	};

	let searchContainerRef = $state<HTMLDivElement | null>(null);

	let showSearchForm = $state<boolean>(true);
</script>

<div class="bg-main top-2 right-2 flex w-full items-center justify-between p-2 max-lg:hidden">
	<!-- 左側 -->
	<div class="flex h-full items-center gap-4 pl-2">
		<div class="flex h-full items-end justify-center gap-2"></div>
	</div>
	<!-- 中央 -->
	{#if !$showDataMenu}
		<div
			bind:this={searchContainerRef}
			class="border-sub relative flex max-w-[400px] flex-1 items-center rounded-full border-1 {showDataEntry
				? 'pointer-events-none opacity-0'
				: ''}"
		>
			<Geocoder
				{layerEntries}
				bind:searchResults
				{searchSuggests}
				bind:inputSearchWord
				searchFeature={(v) => searchFeature(v)}
			/>

			<button
				onclick={() => {
					if (inputSearchWord) {
						searchFeature(inputSearchWord);
					}
				}}
				disabled={$isProcessing}
				class="flex cursor-pointer items-center justify-start gap-2 rounded-r-full bg-black p-2 px-4 text-base transition-colors delay-100 duration-100"
			>
				<Icon icon="stash:search-solid" class="transition-[width, height] h-6 w-6 duration-100" />
			</button>
		</div>
	{/if}
	<!-- 右側 -->
	<div
		class="flex items-center rounded-lg pr-1 max-lg:hidden {showDataEntry
			? 'pointer-events-none opacity-0'
			: ''}"
	>
		<GeolocateControl />
		<StreetViewControl />
		<TerrainControl />
		<GlobeControl />

		<!-- ハンバーガーメニュー -->
		<button
			class="hover:text-accent cursor-pointer rounded-full p-2 text-left text-base drop-shadow-lg duration-100"
			onclick={() => showOtherMenu.set(true)}
		>
			<Icon icon="ic:round-menu" class="h-8 w-8" />
		</button>
	</div>
</div>

<!-- サジェスト -->
<div class="pointer-events-none relative w-full">
	<div class="absolute top-0 z-20 flex w-full items-center justify-between p-2 max-lg:hidden">
		<div class="flex h-full items-center gap-4 pl-2"></div>
		<div class="flex max-w-[400px] flex-1 items-center">
			<SearchSuggest
				{focusFeature}
				bind:featureMenuData
				bind:inputSearchWord
				{layerEntries}
				bind:showSelectionMarker
				bind:selectionMarkerLngLat
				bind:searchSuggests
				bind:showDataEntry
			/>
		</div>
		<div class="flex w-[150px] items-center rounded-lg max-lg:hidden"></div>
	</div>
</div>

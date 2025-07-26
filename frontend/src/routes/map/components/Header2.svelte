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
	import { isSideMenuType } from '$routes/stores/ui';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import type { LngLat } from 'maplibre-gl';

	import Geocoder from '$routes/map/components/search_menu/Geocoder.svelte';
	import type { ResultData } from '$routes/map/utils/feature';
	import { addressSearch, addressCodeToAddress } from '$routes/map/api/address';
	import Fuse from 'fuse.js';

	let searchData: any = null; // 検索データ

	const LIMIT = 100; // 検索結果の表示上限
	const dict: Record<string, string> = {}; // レイヤーIDとレイヤー名の辞書
	let results = $state<ResultData[] | null>([]);
	let isLoading = $state<boolean>(false);

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

	const toggleDataMenu = () => {
		if (!$showDataMenu) {
			showDataMenu.set(true);
			isSideMenuType.set('layer');
		} else {
			showDataMenu.set(false);
			isSideMenuType.set(null);
		}
	};

	const toggleInfoDialog = () => {
		showSideMenu.set(false);
		showInfoDialog.set(!$showInfoDialog);
	};

	const toggleTermsDialog = () => {
		showSideMenu.set(false);
		showTermsDialog.set(!$showTermsDialog);
	};

	mapMode.subscribe((mode) => {
		showSideMenu.set(false);
	});

	const toggleSearchMenu = () => {
		if ($isSideMenuType === 'search') {
			// isSideMenuType.set(null);
		} else {
			isSideMenuType.set('search');
		}
	};

	const toggleLayerMenu = () => {
		if ($isSideMenuType === 'layer') {
			// isSideMenuType.set(null);
		} else {
			isSideMenuType.set('layer');
		}
	};

	const toggleDrawMenu = () => {
		if ($isSideMenuType === 'draw') {
			isSideMenuType.set(null);
		} else {
			isSideMenuType.set('draw');
		}
	};
	let isEditLayerName = $derived.by(() => {
		if ($isStyleEdit && $selectedLayerId) {
			const layerEntry = layerEntries.find((layer) => layer.id === $selectedLayerId);
			return layerEntry ? layerEntry.metaData.name : '';
		}
	});
</script>

<div class="bg-main flex items-center justify-between p-2 text-base">
	<!-- 左側 -->
	<div></div>
	<!-- 中央 -->
	<div
		class="bg-base relative flex max-w-[300px] flex-1 items-center justify-between overflow-hidden rounded-full"
	>
		<Geocoder
			{layerEntries}
			bind:results
			bind:inputSearchWord
			searchFeature={(v) => searchFeature(v)}
		/>
		<button
			transition:slide={{ duration: 300, axis: 'x' }}
			onclick={toggleSearchMenu}
			class="bg-sub flex items-center justify-start gap-2 p-2 text-white"
		>
			<Icon icon="stash:search-solid" class="h-7 w-7" />
		</button>
	</div>
	<!-- 右側 -->
	<div>
		<!-- ハンバーガーメニュー -->
		<button
			class="hover:text-accent cursor-pointer p-2 text-left duration-150"
			onclick={() => showSideMenu.set(true)}
		>
			<Icon icon="ic:round-menu" class="h-7 w-7" />
		</button>
	</div>
</div>

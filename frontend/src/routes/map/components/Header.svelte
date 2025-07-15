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
		showSideMenu.set(false);
		showDataMenu.set(!$showDataMenu);
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
			isSideMenuType.set(null);
		} else {
			isSideMenuType.set('search');
		}
	};

	const toggleLayerMenu = () => {
		if ($isSideMenuType === 'layer') {
			isSideMenuType.set(null);
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

{#if !$isStreetView}
	<div
		class="absolute left-2 top-2 z-20 flex justify-between rounded-full p-1 transition-all duration-150 {$isSideMenuType
			? 'bg-base text-main pr-1'
			: 'bg-main  pr-2 text-white'}"
	>
		{#if $isStyleEdit}
			<div
				transition:slide={{ duration: 300, axis: 'x' }}
				class="text-accent pointer-events-auto flex w-[80px] cursor-pointer items-center justify-start gap-2 p-2 transition-all duration-150"
			>
				<Icon icon="streamline:paint-palette-solid" class="h-7 w-7" />
			</div>
		{/if}
		{#if !$isStyleEdit}
			<div transition:slide={{ duration: 300, axis: 'x' }} class="relative">
				{#if $isSideMenuType}
					<button
						class="hover:text-accent pointer-events-auto flex cursor-pointer items-center justify-start gap-2 p-2 transition-all duration-150"
						onclick={() => {
							isSideMenuType.set(null);
							showDataMenu.set(false);
							isStyleEdit.set(false);
						}}
					>
						<Icon icon="ep:back" class="h-7 w-7" />
					</button>
				{:else}
					<button
						class="hover:text-accent pointer-events-auto cursor-pointer p-2 text-left duration-150"
						onclick={() => showSideMenu.set(true)}
					>
						<Icon icon="ic:round-menu" class="h-7 w-7" />
					</button>
				{/if}
			</div>
			<div
				transition:slide={{ duration: 300, axis: 'x' }}
				class="h-hull w-[1px] rounded-full bg-gray-400"
			></div>
		{/if}
		<div class="flex w-full items-center justify-between">
			{#if $isSideMenuType === 'search'}
				<div
					transition:slide={{ duration: 300, axis: 'x' }}
					class="w-title-bar text-main pointer-events-auto relative shrink-0"
				>
					<Geocoder
						{layerEntries}
						bind:results
						bind:inputSearchWord
						searchFeature={(v) => searchFeature(v)}
					/>
				</div>
			{/if}
			{#if $isSideMenuType === 'search' || !$isSideMenuType}
				<button
					transition:slide={{ duration: 300, axis: 'x' }}
					onclick={toggleSearchMenu}
					class="hover:text-accent transition-text pointer-events-auto flex cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$isSideMenuType ===
					'search'
						? 'text-accent scale-120'
						: ''}"
				>
					<Icon icon="stash:search-solid" class="h-7 w-7" />
				</button>
			{/if}

			{#if ($isSideMenuType === 'layer' && !$isStyleEdit) || !$isSideMenuType}
				<button
					transition:slide={{ duration: 300, axis: 'x' }}
					class="hover:text-accent transition-text pointer-events-auto flex cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$isSideMenuType ===
					'layer'
						? 'text-accent scale-120'
						: ''}"
					onclick={toggleLayerMenu}
				>
					<Icon icon="ic:round-layers" class="h-7 w-7" />
				</button>
			{/if}
			{#if !$isSideMenuType}
				<button
					transition:slide={{ duration: 300, axis: 'x' }}
					class="hover:text-accent transition-text pointer-events-auto flex cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$isSideMenuType ===
					'layer'
						? 'text-accent scale-120'
						: ''}"
					onclick={toggleDataMenu}
				>
					<Icon icon="material-symbols:data-saver-on-rounded" class="h-7 w-7" />
				</button>
			{/if}
			{#if $isSideMenuType === 'layer'}
				<div
					transition:slide={{ duration: 300, axis: 'x' }}
					class="w-title-bar flex shrink-0 items-center justify-center text-nowrap text-center text-lg"
				>
					{#if !$isStyleEdit && !$showDataMenu}
						<div transition:slide={{ duration: 300, axis: 'x' }} class="">地図上の</div>
					{/if}

					<div>データ</div>

					{#if !$isStyleEdit && !$showDataMenu}
						<div transition:slide={{ duration: 300, axis: 'x' }} class="">項目</div>
					{/if}
					{#if $isStyleEdit}
						<div transition:slide={{ duration: 300, axis: 'x' }} class="">のカスタマイズ</div>
					{/if}
					{#if $showDataMenu}
						<div transition:slide={{ duration: 300, axis: 'x' }} class="">カタログ</div>
					{/if}
					{#if $isStyleEdit || $showDataMenu}
						<button
							transition:slide={{ duration: 300, axis: 'x' }}
							class="hover:text-accent pointer-events-auto absolute right-2 flex cursor-pointer items-center justify-start gap-2 p-2 transition-all duration-150"
							onclick={() => {
								isStyleEdit.set(false);
								showDataMenu.set(false);
							}}
						>
							<Icon icon="material-symbols:close-rounded" class="h-7 w-7" />
						</button>
					{/if}
				</div>
			{/if}
			<!-- {#if $isSideMenuType === 'draw' || !$isSideMenuType}
				<button
					transition:slide={{ duration: 300, axis: 'x' }}
					class="hover:text-accent pointer-events-auto flex cursor-pointer items-center justify-start gap-2 p-2 transition-all duration-150 {$isSideMenuType ===
					'draw'
						? 'text-accent scale-120'
						: ''}"
					onclick={toggleDrawMenu}
				>
					<Icon icon="fa6-solid:pen" class="h-5 w-5" />
				</button>
			{/if} -->
			<!-- {#if $isSideMenuType === 'draw'}
				<div
					transition:slide={{ duration: 300, axis: 'x' }}
					class="w-title-bar shrink-0 text-nowrap text-center text-lg"
				>
					描画ツール
				</div>
			{/if} -->
		</div>
	</div>
{/if}

<!-- <li class="absolute right-0 top-0 flex">
	<button
		class="pointer-events-auto grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg {$showDataMenu
			? 'text-accent'
			: ''}"
		onclick={toggleDataMenu}
	>
		<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" />
	</button>
	<StreetViewControl />
	<TerrainControl />
	<GeolocateControl />
</li> -->

<style>
	.c-bg-blur {
		backdrop-filter: blur(10px);
	}

	.w-title-bar {
		@apply w-[290px];
	}
</style>

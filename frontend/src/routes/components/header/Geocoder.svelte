<script lang="ts">
	import Icon from '@iconify/svelte';
	import * as tilebelt from '@mapbox/tilebelt';
	import turfBbox from '@turf/bbox';
	import turfBboxPolygon from '@turf/bbox-polygon';
	import Fuse from 'fuse.js';
	import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import type { LngLatLike, Marker } from 'maplibre-gl';
	import { fade } from 'svelte/transition';

	import searchData from '$routes/data/api/search_data.json';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { VectorEntry, GeoJsonMetaData, TileMetaData } from '$routes/data/types/vector';
	import { getFgbToGeojson, getGeojson } from '$routes/utils/geojson';

	let {
		layerEntries,
		results = $bindable(),
		inputSearchWord = $bindable()
	}: { layerEntries: GeoDataEntry[]; results: any; inputSearchWord: string } = $props();
	let marker: Marker;
	let isLoading = $state<boolean>(false);
	let isComposing = $state<boolean>(false); // 日本語入力中かどうか

	const LIMIT = 1000; // 検索結果の表示上限

	// 検索処理
	const search = async (_searchWord: string) => {
		// 文字数の確認
		if (!_searchWord || _searchWord.length < 2) return;
		_searchWord = _searchWord.trim();

		isLoading = true;
		try {
			await searchFeature(_searchWord);
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = false;
		}
	};

	// const focusFeature = (feature: any) => {
	// 	mapStore.focusFeature(feature);
	// 	mapStore.addSearchFeature(feature);
	// };

	const searchFeature = async (searchWord: string) => {
		const data = layerEntries.filter(
			(layerEntry) =>
				layerEntry.type === 'vector' &&
				layerEntry.interaction.searchKeys &&
				(layerEntry.format.type === 'geojson' || layerEntry.format.type === 'fgb')
		);
		if (!data) return;

		const promises = data.map(async (layerEntry) => {
			if (layerEntry.type !== 'vector') return;
			const searchKeys = layerEntry.interaction.searchKeys?.map((key) => `properties.${key}`);
			if (!searchKeys) return;

			let featuresData: FeatureCollection = {
				type: 'FeatureCollection',
				features: []
			};

			if (layerEntry.format.type === 'geojson') {
				featuresData = await getGeojson(layerEntry.format.url);
			} else if (layerEntry.format.type === 'fgb') {
				featuresData = await getFgbToGeojson(layerEntry.format.url);
			}

			const fuseOptions = {
				threshold: 0.3, // あいまい検索のしきい値
				keys: searchKeys // 検索対象のプロパティ（ドット記法）
			};

			const fuse = new Fuse(featuresData.features, fuseOptions);

			const matchingFeatures = fuse.search(searchWord).map((result) => result.item);

			return {
				name: layerEntry.metaData.name,
				features: matchingFeatures,
				layerId: layerEntry.id
			};
		});

		const test = searchData.filter((data) => {
			return Object.values(data.prop).some(
				(value) =>
					(typeof value === 'string' || typeof value === 'number') &&
					value.toString().includes(searchWord)
			);
		});

		const promises2 = test.map(async (data) => {
			const fgb = await getFgbToGeojson(`./fgb/${data.file_id}.fgb`, data.search_id);

			return {
				name: 5555,
				features: fgb.features,
				layerId: data.file_id
			};
		});

		if (test) {
			const resultsData = await Promise.all(promises2);
			results = resultsData;
		}

		const resultsData = await Promise.all(promises);

		const tilePattern = /^\d+\/\d+\/\d+$/;
		const match = searchWord.match(tilePattern);
		if (match) {
			let numbers = searchWord.split('/');

			// 分割した値を別々の変数に格納する
			const z = Number(numbers[0]); // '89'
			const x = Number(numbers[1]); // '8989'
			const y = Number(numbers[2]); // '8980'

			const tile = tilebelt.tileToBBOX([x, y, z]);
			const feature = turfBboxPolygon(tile);
			feature.properties = {
				name: searchWord
			};

			resultsData.push({
				name: 'タイル座標',
				features: [feature],
				layerId: 'tile'
			});
		}

		// resultsには全ての処理結果が含まれます

		// results = resultsData;
	};

	$effect(() => {
		if (!inputSearchWord) results = null;
	});

	// 検索結果のリセット
	const resetSearchResult = () => {};
</script>

<div
	class="duration-15 pointer-events-auto relative flex flex overflow-hidden rounded-full shadow-md transition-all"
>
	<input
		type="text"
		class="bg-main w-[280px] rounded-md px-4 py-2 focus:outline-none"
		bind:value={inputSearchWord}
		oncompositionstart={() => (isComposing = true)}
		oncompositionend={() => (isComposing = false)}
		onkeydown={(e) => {
			if (e.key === 'Enter' && !isComposing) {
				search(inputSearchWord);
			}
		}}
		placeholder="検索"
	/>

	<div class="absolute right-1 top-2 grid place-self-center pr-2">
		{#if isLoading}
			<div
				class="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
			></div>
		{:else}
			<button
				onclick={() => search(inputSearchWord)}
				disabled={inputSearchWord.trim().length < 2}
				class={inputSearchWord.trim().length > 1
					? 'pointer-events-auto cursor-pointer'
					: 'pointer-events-none'}
			>
				<Icon
					icon="stash:search-solid"
					class="h-6 w-6 {inputSearchWord.trim().length > 1 ? ' text-accent' : 'text-gray-400'}"
				/>
			</button>
		{/if}
	</div>
</div>

<!-- {#if showMenu}
	<div
		transition:fade={{ duration: 150 }}
		class="absolute left-2 top-[60px] flex h-3/5 w-[400px] flex-col overflow-hidden rounded-md bg-white shadow-lg"
	>
		<div class="h-[3rem] flex-shrink-0 bg-[#1DB5C8] p-2 max-lg:hidden">
			<div class="flex h-full w-full justify-center">
				<span class="flex w-full items-center text-lg text-white"
					>検索結果 {featuresData.length > 1000
						? '1000'
						: featuresData.length}件中{filterFeatures.length > 1000
						? '1000'
						: filterFeatures.length}件表示</span
				>
				<button on:click={() => (showMenu = false)}
					><Icon src={XMark} class="h-8 w-8 text-white" /></button
				>
			</div>
		</div>
		<div class="flex w-full gap-2 p-2">
			<select
				bind:value={selectedPrefecture}
				class="flex w-auto cursor-pointer items-center justify-center rounded-full border-2 border-gray-400 bg-white px-2 py-[3px] text-sm transition-all duration-150 focus:outline-none lg:hover:bg-gray-100"
			>
				<option value="">都道府県</option>
				{#each prefectures as prefecture}
					<option value={prefecture}>{prefecture}</option>
				{/each}
			</select>

			<select
				bind:value={selectedMunicipality}
				class="flex w-auto cursor-pointer items-center justify-center rounded-full border-2 border-gray-400 bg-white px-2 py-[3px] text-sm transition-all duration-150 focus:outline-none lg:hover:bg-gray-100"
			>
				<option value="">市区町村</option>
				{#each municipalities as municipality}
					<option value={municipality}>{municipality}</option>
				{/each}
			</select>
		</div>
		<div class="custom-scroll flex h-full flex-col overflow-y-auto p-2">
			{#if featuresData}
				{#each filterFeatures as feature}
					<button
						on:click={() => addMarker(feature.geometry.coordinates, true)}
						on:mouseover={() => addMarker(feature.geometry.coordinates)}
						on:mouseleave={() => marker?.remove()}
						on:focus={() => addMarker(feature.geometry.coordinates)}
						class="flax flex-col gap-2 p-2 text-left lg:hover:!text-[#1DB5C8]"
					>
						<div>{feature.properties['title']}</div>
						<div class="text-sm text-gray-600">
							{feature.properties.address ?? feature.properties['title']}
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>
{/if} -->

<style>
</style>

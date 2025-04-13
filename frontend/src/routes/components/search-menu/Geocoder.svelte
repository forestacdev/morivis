<script lang="ts">
	import Icon from '@iconify/svelte';
	import Fuse from 'fuse.js';
	import type { Marker, LngLatLike } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/data';
	import { addressSearch, addressCodeToAddress } from '$routes/data/api';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { ResultData } from '$routes/utils/feature';
	interface Props {
		layerEntries: GeoDataEntry[];
		layerEntriesData: GeoDataEntry[];
		results: ResultData[] | null;
		inputSearchWord: string;
	}

	let {
		layerEntries,
		layerEntriesData,
		results = $bindable(),
		inputSearchWord = $bindable()
	}: Props = $props();
	let marker: Marker;
	let isLoading = $state<boolean>(false);
	let isComposing = $state<boolean>(false); // 日本語入力中かどうか
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
				featureId: data.feature_id
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
					address
				};
			});

		console.log('features', addressSearchData);

		// const promises = test.map(async (data) => {
		// 	const fgb = await getFgbToGeojson(`./fgb/${data.file_id}.fgb`, data.search_id);

		// 	return {
		// 		name: 5555,
		// 		features: fgb.features,
		// 		layerId: data.file_id
		// 	};
		// });

		results = [...resultsData, ...addressSearchData];

		// const tilePattern = /^\d+\/\d+\/\d+$/;
		// const match = searchWord.match(tilePattern);
		// if (match) {
		// 	let numbers = searchWord.split('/');

		// 	// 分割した値を別々の変数に格納する
		// 	const z = Number(numbers[0]); // '89'
		// 	const x = Number(numbers[1]); // '8989'
		// 	const y = Number(numbers[2]); // '8980'

		// 	const tile = tilebelt.tileToBBOX([x, y, z]);
		// 	const feature = turfBboxPolygon(tile);
		// 	feature.properties = {
		// 		name: searchWord
		// 	};

		// 	resultsData.push({
		// 		name: 'タイル座標',
		// 		features: [feature],
		// 		tile: {
		// 			x: x,
		// 			y: y,
		// 			z: z
		// 		},
		// 		featureId: 0,
		// 		layerId: 'tile'
		// 	});
		// }

		// resultsには全ての処理結果が含まれます
	};

	$effect(() => {
		if (!inputSearchWord) results = null;
	});

	// 検索結果のリセット
	const resetSearchResult = () => {};
</script>

<div
	class="duration-15 pointer-events-auto relative flex overflow-hidden rounded-full shadow-md transition-all"
>
	<input
		type="text"
		class="bg-main w-[280px] rounded-md px-4 py-2 text-base focus:outline-none"
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

<style>
</style>

<script lang="ts">
	import Icon from '@iconify/svelte';
	import Fuse from 'fuse.js';
	import type { Marker } from 'maplibre-gl';

	import searchData from './search_data.json';

	import type { GeoDataEntry } from '$routes/data/types';
	import type { ResultData } from '$routes/utils/feature';
	interface Props {
		layerEntries: GeoDataEntry[];
		results: ResultData[] | null;
		inputSearchWord: string;
	}

	let { layerEntries, results = $bindable(), inputSearchWord = $bindable() }: Props = $props();
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

	const fuse = new Fuse(searchData, {
		keys: ['search_values'],
		threshold: 0.1
	});

	// const focusFeature = (feature: any) => {
	// 	mapStore.focusFeature(feature);
	// 	mapStore.addSearchFeature(feature);
	// };

	const searchFeature = async (searchWord: string) => {
		// 検索実行
		const result = fuse.search(searchWord, {
			limit: LIMIT
		});

		// const promises = test.map(async (data) => {
		// 	const fgb = await getFgbToGeojson(`./fgb/${data.file_id}.fgb`, data.search_id);

		// 	return {
		// 		name: 5555,
		// 		features: fgb.features,
		// 		layerId: data.file_id
		// 	};
		// });

		const resultsData = result.map((item) => {
			const data = item.item;

			return {
				name: data.name,

				tile: data.tile_coords,
				point: data.point,
				layerId: data.layer_id,
				featureId: data.feature_id
			};
		});

		if (resultsData.length === 0) {
			return;
		}

		results = resultsData;

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

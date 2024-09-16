<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';
	import SvgTest from '$lib/svg/アカデミー施設/森のコテージ.svg';
	import debounce from 'lodash.debounce';

	import type { LayerEntry, GeojsonEntry, GeometryType } from '$lib/data/types';
	import { layerData } from '$lib/data/layers';
	import { isSide, showDataMenu } from '$lib/store/store';
	import { flip } from 'svelte/animate';
	import { addedLayerIds } from '$lib/store/store';
	import { getGeojson } from '$lib/utils/geojson';
	import tilebelt from '@mapbox/tilebelt';
	import turfBboxPolygon from '@turf/bbox-polygon';
	// export let layerDataEntries: LayerEntry[] = [];
	// export let clickedLayerId: string;

	// Fuse.jsの読み込み
	import Fuse from 'fuse.js';
	import { mapStore } from '$lib/store/map';

	let rotatingElement: HTMLElement;
	let searchWord: string = '';
	let results: any;

	type ResultData = {
		name: string;
		features: any[];
	};

	const tweenMe = (node: Node) => {
		let tl = gsap.timeline();
		const duration = 0.15; // アニメーションの長さを0.5秒に設定

		tl.from(node, {
			duration: duration,
			opacity: 0,
			x: '-100%', // 左から右へスライド
			ease: 'power2.out' // スムーズな動きのためのイージング
		});

		return {
			duration: tl.totalDuration() * 1000, // ミリ秒に変換
			tick: (t: number) => {
				tl.progress(t);
			}
		};
	};

	onMount(() => {});

	const focusFeature = (feature: any) => {
		mapStore.focusFeature(feature);
		mapStore.addSearchFeature(feature);
	};

	const searchFeature = async (searchWord: string) => {
		const data: GeojsonEntry<GeometryType>[] = layerData.filter(
			(layerEntry) => layerEntry.dataType === 'geojson' && layerEntry.searchKeys
		);
		if (!data) return;

		const promises = data.map(async (layerEntry) => {
			const searchKeys = layerEntry.searchKeys?.map((key) => `properties.${key}`);
			if (!searchKeys) return;

			const featuresData = await getGeojson(layerEntry.url);

			const fuseOptions = {
				threshold: 0.3, // あいまい検索のしきい値
				keys: searchKeys // 検索対象のプロパティ（ドット記法）
			};

			const fuse = new Fuse(featuresData.features, fuseOptions);

			const matchingFeatures = fuse.search(searchWord).map((result) => result.item);

			return {
				name: layerEntry.name,
				features: matchingFeatures
			};
		});

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
			console.log(feature);

			resultsData.push({
				name: 'タイル座標',
				features: [feature]
			});
		}

		// console.log(results);

		// resultsには全ての処理結果が含まれます

		results = resultsData;
	};

	const searchFeatureDebounced = debounce(searchFeature, 500);
	$: {
		if (searchWord) {
			searchFeatureDebounced(searchWord);
		}
	}
</script>

{#if $isSide === 'search'}
	<div
		transition:tweenMe
		class="left-0 top-0 flex h-full w-[400px] flex-col rounded-sm bg-[#69A158] p-4 pb-[100px] pl-[70px] pt-[50px] text-slate-100"
	>
		<div class="p-2">
			<input bind:value={searchWord} class="w-full p-2 text-black" type="text" />
		</div>
		<div class="flex h-full w-full gap-4">
			<div
				class="custom-scroll overflow-x-hidden　w-full flex flex-col gap-y-2 overflow-y-auto"
			>
				{#if results}
					{#each results.filter((data) => data.features.length > 0) as result}
						{#each result.features as feature}
							<button
								on:click={() => focusFeature(feature)}
								class="flex w-full flex-col rounded-sm bg-slate-50 p-1 text-left text-black"
							>
								<span class="text-lg"
									>{feature.properties.name ??
										feature.properties['小林班ID']}</span
								>
								<span class="text-xs">{result.name}</span>
							</button>
						{/each}
					{/each}
				{/if}
				ここに検索結果データ
			</div>
			<!-- <DataMenu bind:layerDataEntries /> -->
		</div>
		<div class="custom-text">SEARCH</div>
	</div>
{/if}

<style>
	.custom-text {
		position: absolute;
		transform: rotate(20deg);
		bottom: 10px;
		left: 10px;
		font-size: 4.5rem;
		font-weight: 700;
		color: #000;
	}
</style>

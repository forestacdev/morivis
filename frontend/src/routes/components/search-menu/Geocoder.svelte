<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Marker, LngLatLike } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import type { GeoDataEntry } from '$routes/data/types';
	import type { ResultData } from '$routes/utils/feature';
	interface Props {
		layerEntries: GeoDataEntry[];
		layerEntriesData: GeoDataEntry[];
		results: ResultData[] | null;
		inputSearchWord: string;
		searchFeature: (searchWord: string) => Promise<void>;
	}

	let {
		layerEntries,
		layerEntriesData,
		results = $bindable(),
		inputSearchWord = $bindable(),
		searchFeature
	}: Props = $props();
	let marker: Marker;
	let isLoading = $state<boolean>(false);
	let isComposing = $state<boolean>(false); // 日本語入力中かどうか

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

	$effect(() => {
		if (!inputSearchWord) results = null;
	});

	// 検索結果のリセット
	const resetSearchResult = () => {};
</script>

<div
	class="duration-15 pointer-events-auto relative flex overflow-hidden rounded-full transition-all"
>
	<input
		type="text"
		class="bg-base focus:outline-hidden w-[280px] rounded-md px-4 py-2"
		bind:value={inputSearchWord}
		oncompositionstart={() => (isComposing = true)}
		oncompositionend={() => (isComposing = false)}
		onkeydown={(e) => {
			if (e.key === 'Enter' && !isComposing) {
				search(inputSearchWord);
			}
		}}
		placeholder="施設名/住所"
	/>

	<div class="absolute right-1 top-2 grid place-self-center pr-2">
		{#if isLoading}
			<div
				class="h-6 w-6 animate-spin cursor-pointer rounded-full border-2 border-gray-400 border-t-transparent"
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

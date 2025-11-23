<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Marker, LngLatLike } from 'maplibre-gl';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { ResultData } from '$routes/map/utils/feature';
	import { showSearchSuggest } from '$routes/stores/ui';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	interface Props {
		layerEntries: GeoDataEntry[];
		searchResults: ResultData[] | null;
		searchSuggests: ResultData[] | null;
		inputSearchWord: string;
		searchFeature: (searchWord: string) => Promise<void>;
	}

	let {
		layerEntries,
		searchResults = $bindable(),
		searchSuggests,
		inputSearchWord = $bindable(),
		searchFeature
	}: Props = $props();
	let isLoading = $state<boolean>(false);
	let isComposing = $state<boolean>(false); // 日本語入力中かどうか
	let inputElement = $state<HTMLInputElement | null>(null); // 入力要素

	// 検索処理
	const search = async (_searchWord: string) => {
		// 文字数の確認

		_searchWord = _searchWord.trim();

		if (!_searchWord) return;

		isLoading = true;
		try {
			await searchFeature(_searchWord);
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = false;
		}
	};
</script>

<input
	bind:this={inputElement}
	in:fade={{ duration: 100, delay: 100 }}
	out:fade={{ duration: 100 }}
	type="text"
	class="focus:outline-hidden placeholder:gray-400 w-full rounded-l-full bg-black px-4 py-2 text-base outline-0"
	bind:value={inputSearchWord}
	oncompositionstart={() => (isComposing = true)}
	oncompositionend={() => (isComposing = false)}
	onkeydown={(e) => {
		if (e.key === 'Enter' && !isComposing) {
			search(inputSearchWord);
		}
	}}
	placeholder="施設名 / 住所 / 座標 / データ名"
	onfocus={() => showSearchSuggest.set(true)}
/>

{#if inputSearchWord}
	<button
		onclick={() => (inputSearchWord = '')}
		disabled={!inputSearchWord}
		class="absolute right-14 top-0 grid h-full cursor-pointer place-items-center"
	>
		<Icon icon="material-symbols:close-rounded" class="h-7 w-7 text-gray-400" />
	</button>
{/if}

<style>
</style>

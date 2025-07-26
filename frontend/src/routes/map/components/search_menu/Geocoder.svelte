<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Marker, LngLatLike } from 'maplibre-gl';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { ResultData } from '$routes/map/utils/feature';
	import { showSearchSuggest } from '$routes/stores/ui';
	interface Props {
		layerEntries: GeoDataEntry[];

		results: ResultData[] | null;
		inputSearchWord: string;
		searchFeature: (searchWord: string) => Promise<void>;
	}

	let {
		layerEntries,

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

		_searchWord = _searchWord.trim();

		if (!_searchWord) return;

		isLoading = true;
		try {
			console.log('Searching for:', _searchWord);
			await searchFeature(_searchWord);
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = false;
		}
	};

	$effect(() => {
		if (!inputSearchWord) results = null;
	});

	// 検索結果のリセット
	const resetSearchResult = () => {};
</script>

<input
	type="text"
	class="bg-base focus:outline-hidden placeholder:gray-400 text-main w-full rounded-l-full px-4 py-2 outline-0"
	bind:value={inputSearchWord}
	oncompositionstart={() => (isComposing = true)}
	oncompositionend={() => (isComposing = false)}
	onkeydown={(e) => {
		if (e.key === 'Enter' && !isComposing) {
			search(inputSearchWord);
		}
	}}
	placeholder="施設名/住所"
	onfocus={() => showSearchSuggest.set(true)}
/>

{#if inputSearchWord}
	<button
		onclick={() => (inputSearchWord = '')}
		disabled={!inputSearchWord}
		class="absolute right-11 top-0 grid h-full cursor-pointer place-items-center"
	>
		<Icon icon="material-symbols:close-rounded" class="h-7 w-7 text-gray-400" />
	</button>
{/if}

<style>
</style>

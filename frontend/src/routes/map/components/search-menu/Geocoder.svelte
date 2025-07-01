<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Marker, LngLatLike } from 'maplibre-gl';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { ResultData } from '$routes/map/utils/feature';
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

<!-- <div
	class="duration-15 pointer-events-auto relative flex w-full overflow-hidden rounded-full transition-all"
>
	<input
		type="text"
		class="bg-base focus:outline-hidden w-full px-4 py-2"
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
	{#if inputSearchWord}
		<button
			onclick={() => (inputSearchWord = '')}
			disabled={!inputSearchWord}
			class="absolute right-[60px] grid h-full cursor-pointer place-items-center"
		>
			<Icon icon="material-symbols:close-rounded" class="h-7 w-7 text-gray-400" />
		</button>
	{/if}

	<button
		onclick={() => search(inputSearchWord)}
		disabled={inputSearchWord.trim().length < 2}
		class="bg-accent pointer-events-auto grid h-full shrink-0 cursor-pointer place-items-center px-4 py-2"
	>
		<Icon icon="stash:search-solid" class="h-6 w-6  text-white" />
	</button>
</div> -->

<input
	type="text"
	class="bg-base focus:outline-hidden placeholder:gray-400 w-full px-4 py-2"
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

<style>
</style>

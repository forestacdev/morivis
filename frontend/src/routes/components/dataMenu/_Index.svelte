<script lang="ts">
	import Icon from '@iconify/svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';

	import DataSlot from '$routes/components/dataMenu/DataMenuSlot.svelte';
	import DataPreview from '$routes/components/dataMenu/DataPreview.svelte';
	import { geoDataEntry } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import { addedLayerIds, showDataMenu } from '$routes/store';

	// export let mapBearing: number;
	let dataEntries = $state<GeoDataEntry[]>([...geoDataEntry]);
	let filterDataEntries = $state<GeoDataEntry[]>([]);
	let searchWord = $state<string>(''); // 検索ワード

	$effect(() => {
		// 検索ワードが空でない場合、filterDataEntriesにフィルタリングされたデータを格納
		if (searchWord) {
			filterDataEntries = dataEntries.filter((data) =>
				data.metaData.name.toLowerCase().includes(searchWord.toLowerCase())
			);
		} else {
			// 検索ワードが空の場合、全てのデータを表示
			filterDataEntries = dataEntries;
		}
	});

	const toggleDataMenu = () => {
		showDataMenu.set(!showDataMenu);
	};
</script>

<div class="absolute bottom-0 z-30 h-screen w-full p-8 pl-[120px] {$showDataMenu ? '' : 'hidden'}">
	<div class="bg-main relative flex h-full w-full flex-grow flex-col rounded-lg p-2">
		<div class="flex flex-shrink-0 items-center justify-between gap-4 p-2">
			<span class="flex-shrink-0 text-lg">データカタログ</span>
			<div class="flex w-full max-w-[400px] rounded-full border-[1px] border-gray-400 px-4">
				<input
					class="c-search-form tex grid w-full text-left text-gray-500"
					type="text"
					placeholder="検索"
					bind:value={searchWord}
				/>
				<button
					onclick={() => (searchWord = '')}
					disabled={!searchWord}
					class="grid place-items-center"
				>
					<Icon icon="material-symbols:close-rounded" class="h-8 w-8 text-gray-400" />
				</button>
			</div>
			<button onclick={toggleDataMenu} class="bg-base rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>
		<div class="c-scroll h-full w-full flex-grow overflow-y-auto overflow-x-hidden">
			<div class="css-grid h-full">
				{#each filterDataEntries as dataEntry (dataEntry.id)}
					<DataSlot {dataEntry} />
				{/each}
			</div>
			<!-- <DataPreview bind:showDataEntry /> -->
		</div>
	</div>
</div>

<style>
	.css-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* 幅を指定 */
		grid-auto-rows: 300px; /* 高さを指定 */
		gap: 10px; /* 子要素間の隙間 */
	}
	/* 検索ボックスのスタイル */
	.c-search-form {
		appearance: none;
		background-color: transparent;
		padding: 0.5rem;
	}
	.c-search-form:focus {
		outline: var(--outline-color);
	}
</style>

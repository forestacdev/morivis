<script lang="ts">
	import Icon from '@iconify/svelte';

	import DataSlot from '$routes/components/data-menu/DataMenuSlot.svelte';
	import DataPreview from '$routes/components/data-menu/DataPreview.svelte';
	import { geoDataEntries } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import { showDataMenu } from '$routes/store';

	// export let mapBearing: number;
	let dataEntries = $state<GeoDataEntry[]>([...geoDataEntries]);
	let filterDataEntries = $state<GeoDataEntry[]>([]);
	let searchWord = $state<string>(''); // 検索ワード
	let showDataEntry = $state<GeoDataEntry | null>(null); // プレビュー用のデータ

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

<div class="absolute bottom-0 z-20 h-dvh w-full p-8 pl-[120px] {$showDataMenu ? '' : 'hidden'}">
	<div class="bg-main relative flex h-full w-full flex-col overflow-hidden rounded-lg p-2">
		<div class="flex grow items-center justify-between gap-4 p-2">
			<span class="shrink-0 text-base text-lg">データカタログ</span>
			<div class="bg-base flex w-full max-w-[400px] rounded-full border-[1px] px-4">
				<input
					class="c-search-form tex grid w-full text-left text-gray-500"
					type="text"
					placeholder="検索"
					bind:value={searchWord}
				/>
				<button
					onclick={() => (searchWord = '')}
					disabled={!searchWord}
					class="grid cursor-pointer place-items-center"
				>
					<Icon icon="material-symbols:close-rounded" class="h-8 w-8 text-gray-400" />
				</button>
			</div>
			<button onclick={toggleDataMenu} class="bg-base cursor-pointer rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>
		<div class="c-scroll relative h-full w-full grow overflow-y-auto overflow-x-hidden">
			<div class="css-grid h-full">
				{#if filterDataEntries.length === 0}
					<div
						class="absolute left-1/2 top-1/2 flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center"
					>
						<span class="text-gray-500">データが見つかりません</span>
					</div>
				{/if}
				{#each filterDataEntries as dataEntry (dataEntry.id)}
					<DataSlot {dataEntry} bind:showDataEntry />
				{/each}
			</div>
		</div>
		{#if showDataEntry}
			<DataPreview bind:showDataEntry />
		{/if}
	</div>
</div>

<style>
	.css-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* 幅を指定 */
		grid-auto-rows: 360px; /* 高さを指定 */
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

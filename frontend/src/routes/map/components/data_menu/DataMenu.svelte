<script lang="ts">
	import Icon from '@iconify/svelte';
	import VirtualList from 'svelte-tiny-virtual-list';

	import type { DialogType } from '$routes/map/types';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import DataSlot from '$routes/map/components/data_menu/DataMenuSlot.svelte';
	import UploadPane from '$routes/map/components/data_menu/UploadPane.svelte';
	import { geoDataEntries } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { isStyleEdit, showDataMenu } from '$routes/stores';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import { TAG_LIST } from '$routes/map/data/types/tags';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		dropFile: File | FileList | null;
		showDialogType: DialogType;
	}

	let {
		showDataEntry = $bindable(),
		dropFile = $bindable(),
		showDialogType = $bindable()
	}: Props = $props();

	// export let mapBearing: number;
	let dataEntries = $state<GeoDataEntry[]>([...geoDataEntries]);
	let filterDataEntries = $state<GeoDataEntry[]>([]);
	let searchWord = $state<string>(''); // 検索ワード
	let showAddedData = $state<boolean>(true); // データ追加の状態

	$effect(() => {
		// 検索ワードが空でない場合、filterDataEntriesにフィルタリングされたデータを格納
		if (searchWord) {
			filterDataEntries = dataEntries.filter((data) =>
				data.metaData.name.toLowerCase().includes(searchWord.toLowerCase())
			);
		} else {
			// 検索ワードが空の場合、全てのデータを表示
			if (!showAddedData) {
				filterDataEntries = dataEntries.filter((data) => !$activeLayerIdsStore.includes(data.id));
			} else {
				filterDataEntries = dataEntries;
			}
		}
	});

	const toggleDataMenu = () => {
		showDataMenu.set(!showDataMenu);
	};

	let gridHeight = $state<number>(0);
	let gridWidth = $state<number>(0);
	let rowColumns = $state<number>(2); // グリッドの列数
	let itemHeight = $state<number>(300 + 70); // item Height + grid margin & padding
	let itemWidth = $state<number>(300 + 10); // item Height + grid margin & padding

	$effect(() => {
		if (gridWidth > itemWidth * 2) {
			// 2列分の幅がある場合のみ再計算
			rowColumns = Math.floor(gridWidth / itemWidth);
			if (rowColumns < 2) {
				rowColumns = 2; // 計算結果が2未満になった場合も2を維持
			}
		} else {
			rowColumns = 2; // 幅が足りない場合は最低2列を維持
		}
	});

	let options = $state<
		{
			key: string;
			name: string;
		}[]
	>([
		{ key: 'system', name: 'アプリ内' },
		{ key: 'user', name: 'アップロード' }
	]);

	let selected = $state<string>('system');

	// 閉じられたときの処理
	showDataMenu.subscribe((value) => {
		if (!value) {
			selected = 'system';
			showDataEntry = null;
			searchWord = '';
		}
	});
</script>

<div
	class="bg-main absolute bottom-0 flex h-dvh w-full flex-col overflow-hidden p-2 pl-[100px] transition-all duration-300 {$showDataMenu
		? 'pointer-events-auto translate-y-0 opacity-100'
		: 'pointer-events-none -translate-x-[100px] opacity-0'}"
>
	<button
		class="hover:text-accent bg-base pointer-events-auto absolute left-4 top-4 grid cursor-pointer place-items-center rounded-full p-2 transition-all duration-150"
		onclick={() => {
			showDataMenu.set(false);
		}}
	>
		<Icon icon="ep:back" class="h-7 w-7" />
	</button>
	<div class="flex grow items-center justify-between gap-4 p-2">
		<div class="flex items-center gap-2 text-base">
			<Icon icon="material-symbols:data-saver-on-rounded" class="h-10 w-10" />
			<span class="select-none text-lg">データカタログ</span>
		</div>

		{#if selected === 'system'}
			<div class="bg-base relative flex w-full max-w-[400px] rounded-full border-[1px] px-4">
				<input
					class="c-search-form tex grid w-full text-left text-gray-500"
					type="text"
					placeholder="検索"
					disabled={selected === 'user'}
					bind:value={searchWord}
				/>
				{#if searchWord}
					<button
						onclick={() => (searchWord = '')}
						disabled={!searchWord}
						class="absolute right-2 top-[5px] grid cursor-pointer place-items-center"
					>
						<Icon icon="material-symbols:close-rounded" class="h-8 w-8 text-gray-400" />
					</button>
				{/if}
			</div>
		{/if}

		<div class="w-[300px] shrink-0">
			<HorizontalSelectBox bind:group={selected} bind:options />
		</div>
	</div>
	{#if selected === 'system'}
		<div class="flex w-full grow items-center justify-between gap-4 p-2">
			<!-- <div class="flex items-center justify-center gap-1 overflow-x-auto text-base">
			{#each TAG_LIST as tag}
				<span class="shrink-0 rounded-lg bg-black p-1 px-2 text-xs">{tag}</span>
			{/each}
		</div> -->
			<div>
				<Switch label="追加済みデータの表示" bind:value={showAddedData} />
			</div>
		</div>
	{/if}

	{#if selected === 'system'}
		{#if filterDataEntries.length}
			<div class="c-list h-full" bind:clientHeight={gridHeight} bind:clientWidth={gridWidth}>
				<VirtualList
					width="100%"
					height="100%"
					itemCount={filterDataEntries.length / rowColumns + 1}
					itemSize={itemHeight}
				>
					<div slot="item" let:index let:style {style}>
						<div class="row" style="--grid-columns: {rowColumns};">
							{#each Array(rowColumns) as _, i}
								{#if filterDataEntries[index * rowColumns + i]}
									<DataSlot
										dataEntry={filterDataEntries[index * rowColumns + i]}
										bind:showDataEntry
										bind:itemHeight
										index={index * rowColumns + i}
									/>
								{/if}
							{/each}
						</div>
					</div>
				</VirtualList>
			</div>
		{/if}
		{#if filterDataEntries.length === 0}
			<div class="flex h-full w-full items-center justify-center">
				<div class="flex flex-col items-center gap-4">
					<Icon icon="streamline:sad-face" class="h-16 w-16 text-gray-500 opacity-95" />
					<span class="text-2xl text-gray-500">データが見つかりません</span>
				</div>
			</div>
		{/if}
	{/if}
	{#if selected === 'user'}
		<UploadPane bind:showDataEntry bind:dropFile bind:showDialogType />
	{/if}
</div>

<style>
	.c-list:global(.virtual-list-wrapper) {
		height: 100%;
	}

	:global(.virtual-list-wrapper) {
		/* スクロールバー */
		-webkit-overflow-scrolling: touch;
		scrollbar-gutter: stable;
	}

	:global(.virtual-list-wrapper::-webkit-scrollbar) {
		width: 5px;
		height: 5px;
	}

	:global(.virtual-list-wrapper::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.virtual-list-wrapper::-webkit-scrollbar-thumb) {
		background: var(--color-accent);
		border-radius: 9999px;
	}

	.row {
		display: grid;
		gap: 10px;
		grid-template-columns: repeat(var(--grid-columns), minmax(300px, 1fr));
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

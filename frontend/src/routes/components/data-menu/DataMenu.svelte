<script lang="ts">
	import Icon from '@iconify/svelte';
	import VirtualList from 'svelte-tiny-virtual-list';

	import type { DialogType } from '$routes/+page.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import DataSlot from '$routes/components/data-menu/DataMenuSlot.svelte';
	import UploadPane from '$routes/components/data-menu/UploadPane.svelte';
	import { geoDataEntries } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import { showDataMenu } from '$routes/store';

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
</script>

<div
	class="pointer-events-none absolute bottom-0 z-10 h-dvh w-full p-8 pl-[120px] pt-[60px] transition-all duration-150 {$showDataMenu
		? 'opacity-100'
		: 'opacity-0'}"
>
	<div
		class="bg-main pointer-events-auto relative flex h-full w-full flex-col overflow-hidden rounded-lg p-2 {$showDataMenu
			? 'pointer-events-auto'
			: 'pointer-events-none'}"
	>
		<div class="flex grow items-center justify-between gap-4 p-2">
			<span class="shrink-0 text-base text-lg">データカタログ</span>

			<div class="bg-base flex w-full max-w-[400px] rounded-full border-[1px] px-4">
				<input
					class="c-search-form tex grid w-full text-left text-gray-500"
					type="text"
					placeholder="検索"
					disabled={selected === 'user'}
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

			<div class="w-[300px] shrink-0">
				<HorizontalSelectBox bind:group={selected} bind:options />
			</div>
			<button onclick={toggleDataMenu} class="bg-base cursor-pointer rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>

		{#if selected === 'system'}
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
			{#if filterDataEntries.length === 0}
				<div
					class="absolute left-1/2 top-1/2 flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center"
				>
					<span class="text-gray-500">データが見つかりません</span>
				</div>
			{/if}
		{/if}
		{#if selected === 'user'}
			<UploadPane bind:showDataEntry bind:dropFile bind:showDialogType />
		{/if}
	</div>
</div>

<style>
	.c-list :global(.virtual-list-wrapper) {
		height: 100%;
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

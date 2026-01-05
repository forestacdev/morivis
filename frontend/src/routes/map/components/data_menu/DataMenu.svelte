<script lang="ts">
	import Icon from '@iconify/svelte';
	import VirtualList from 'svelte-tiny-virtual-list';

	import type { DialogType } from '$routes/map/types';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import DataSlot from '$routes/map/components/data_menu/DataMenuSlot.svelte';
	import UploadPane from '$routes/map/components/data_menu/UploadPane.svelte';
	import { geoDataEntries, layerDataFuse } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { isStyleEdit } from '$routes/stores';
	import { isMobile, showDataMenu } from '$routes/stores/ui';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import { TAG_LIST, type Tag } from '$routes/map/data/types/tags';

	import Fuse from 'fuse.js';
	import { fly, slide, scale } from 'svelte/transition';
	import { cubicIn } from 'svelte/easing';
	import { checkMobile } from '$routes/map/utils/ui';
	import { encode } from '$routes/map/utils/normalized';

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
	let filterDataEntries = $state<GeoDataEntry[]>([]);

	let searchWord = $state<string>(''); // 検索ワード
	let showAddedData = $state<boolean>(true); // データ追加の状態
	let tagList = $derived.by(() => {
		const tags = new Set<string>();
		geoDataEntries.forEach((entry) => {
			entry.metaData.tags.forEach((tag) => tags.add(tag));
		});
		return Array.from(tags);
	});

	let selectedTag = $state<Tag | null>(null); // 選択されたタグ

	// 文字種を判定して優先度を返す
	const getCharPriority = (str: string): number => {
		const firstChar = str.charAt(0);
		if (/[\u4E00-\u9FFF]/.test(firstChar)) return 0; // 漢字
		if (/[\u30A0-\u30FF]/.test(firstChar)) return 1; // カタカナ
		if (/[\u3040-\u309F]/.test(firstChar)) return 2; // ひらがな
		if (/[A-Za-z]/.test(firstChar)) return 3; // 英語
		if (/[0-9]/.test(firstChar)) return 4; // 数字
		return 5;
	};

	const collator = new Intl.Collator('ja', { sensitivity: 'base' });

	$effect(() => {
		let results = geoDataEntries;

		// タグでフィルタリング
		if (selectedTag) {
			results = results.filter((data) => data.metaData.tags.includes(selectedTag));
		}

		// 検索ワードでフィルタリング（Fuse.jsを使用）
		if (searchWord) {
			const result = layerDataFuse.search(encode(searchWord));
			results = result.map((item) => item.item);
		}

		// 追加済みデータの非表示
		if (!showAddedData) {
			results = results.filter((data) => !$activeLayerIdsStore.includes(data.id));
		}

		// 五十音順でソート（漢字 → カタカナ → 英語 → 数字）
		// 五十音順でソート（森林文化アカデミー優先 → 岐阜県 → 漢字 → カタカナ → 英語 → 数字）
		filterDataEntries = results.sort((a, b) => {
			const locationA = a.metaData.location || '';
			const locationB = b.metaData.location || '';

			// locationの優先度を取得
			const getLocationPriority = (location: string): number => {
				if (location.includes('森林文化アカデミー')) return 0;
				if (location.includes('岐阜県')) return 1;
				return 2;
			};

			const locationPriorityA = getLocationPriority(locationA);
			const locationPriorityB = getLocationPriority(locationB);

			// locationの優先度でソート
			if (locationPriorityA !== locationPriorityB) return locationPriorityA - locationPriorityB;

			// 文字種の優先度でソート
			const priorityA = getCharPriority(a.metaData.name);
			const priorityB = getCharPriority(b.metaData.name);
			if (priorityA !== priorityB) return priorityA - priorityB;

			// 同じ文字種内では五十音順
			return collator.compare(a.metaData.name, b.metaData.name);
		});
	});

	const toggleDataMenu = () => {
		showDataMenu.set(!showDataMenu);
	};

	let gridHeight = $state<number>(0);
	let gridWidth = $state<number>(0);
	let rowColumns = $state<number>(2); // グリッドの列数
	let itemHeight = $state<number>(450); // item Height + grid margin & padding
	let itemWidth = $state<number>(300); // item Height + grid margin & padding

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

	let options = $state.raw<
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

{#if $showDataMenu}
	<div
		transition:scale={{ duration: 300, start: !$isMobile ? 0.9 : 1.0 }}
		class="bg-main lg:duration-30 absolute bottom-0 flex h-full w-full flex-col overflow-hidden p-2 lg:pl-[100px] lg:transition-all"
		style="padding-top: env(safe-area-inset-top);"
	>
		<!-- <button
		class="hover:text-accent bg-base pointer-events-auto absolute left-4 top-4 grid cursor-pointer place-items-center rounded-full p-2 transition-all duration-150 max-lg:hidden"
		onclick={() => {
			showDataMenu.set(false);
		}}
	>
		<Icon icon="ep:back" class="h-7 w-7" />
	</button> -->
		<div
			class="flex grow items-center justify-between gap-4 p-2 max-lg:absolute max-lg:left-0 max-lg:top-2 max-lg:z-10 max-lg:w-full max-lg:px-2 lg:mt-3"
			style="padding-top: env(safe-area-inset-top);"
		>
			<div class="flex items-center gap-2 text-base max-lg:hidden">
				<Icon icon="material-symbols:data-saver-on-rounded" class="h-10 w-10" />
				<span class="select-none text-lg">データカタログ</span>
			</div>

			{#if selected === 'system'}
				<div
					class="border-sub relative flex w-full rounded-full border bg-black px-4 lg:max-w-[400px]"
				>
					<input
						class="c-search-form tex grid w-full text-left text-base"
						type="text"
						placeholder="検索"
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

			<div class="w-[300px] shrink-0 max-lg:hidden">
				<HorizontalSelectBox bind:group={selected} bind:options />
			</div>
		</div>
		{#if selected === 'system'}
			<!-- <div class="flex w-full grow items-center justify-between gap-2 p-2 max-lg:hidden">
				{#each tagList as tag}
					<button
						onclick={() => {
							if (selectedTag === tag) {
								selectedTag = null; // 同じタグが選択された場合は解除
							} else {
								selectedTag = tag;
							}
							// フィルタリング処理をここに追加
						}}
						class="shrink-0 cursor-pointer rounded-lg p-2 px-2 transition-colors {selectedTag ===
						tag
							? 'bg-base text-black'
							: 'bg-black text-base'}">{tag}</button
					>
				{/each}
			</div> -->
			<div class="flex w-full grow items-start justify-between gap-4 p-2 max-lg:hidden">
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
							<div class="h-16 w-full lg:hidden"><!-- スマホ表示スペース --></div>
							<div
								class="grid max-lg:gap-[5px] lg:gap-3"
								style="--grid-columns: {rowColumns}; grid-template-columns: repeat(var(--grid-columns), minmax({!$isMobile
									? 256
									: 100}px, 1fr));"
							>
								{#each Array(rowColumns) as _, i}
									{#if filterDataEntries[index * rowColumns + i]}
										{@const itemIndex = index * rowColumns + i}
										{@const isTopEdge = itemIndex < rowColumns}
										{@const isLeftEdge = itemIndex % rowColumns === 0}
										{@const isRightEdge = itemIndex % rowColumns === rowColumns - 1}
										<DataSlot
											dataEntry={filterDataEntries[itemIndex]}
											bind:showDataEntry
											bind:itemHeight
											index={itemIndex}
											{isLeftEdge}
											{isRightEdge}
											{isTopEdge}
										/>
									{/if}
								{/each}
							</div>
						</div>
					</VirtualList>
				</div>
			{/if}
			{#if filterDataEntries.length === 0}
				<div
					class="flex h-full w-full justify-center max-lg:items-start max-lg:pt-4 lg:items-center"
				>
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
{/if}

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

	@media (width < 768px) {
		:global(.virtual-list-wrapper) {
			/* スクロールバー */
			-ms-overflow-style: none;
			scrollbar-width: none;

			&::-webkit-scrollbar {
				display: none;
			}
		}
	}

	:global(.virtual-list-wrapper::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.virtual-list-wrapper::-webkit-scrollbar-thumb) {
		background: var(--color-accent);
		border-radius: 9999px;
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

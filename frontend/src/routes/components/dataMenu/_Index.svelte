<script lang="ts">
	import Icon from '@iconify/svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';

	import type { GeoDataEntry } from '$rmap/data/types';
	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import DataPreview from '$routes/components/dataMenu/DataPreview.svelte';
	import { IMAGE_TILE_XYZ } from '$routes/constants';
	import { COVER_NO_IMAGE_PATH } from '$routes/constants';
	import { geoDataEntry } from '$routes/data';
	import { addedLayerIds, showDataMenu } from '$routes/store';
	import { getImagePmtiles } from '$routes/utils/raster';

	// export let mapBearing: number;
	let dataEntries = $state<GeoDataEntry[]>([...geoDataEntry]);
	let filterDataEntries = $state<GeoDataEntry[]>([]);
	let searchWord = $state<string>(''); // 検索ワード

	let showDataEntry = $state<GeoDataEntry | null>(null);

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

	let addedDataIds = $state<string[]>($addedLayerIds);

	addedLayerIds.subscribe((value) => {
		addedDataIds = value;
	});

	const showData = (id: string) => {
		showDataEntry = dataEntries.find((data) => data.id === id) as GeoDataEntry;
	};

	const toggleDataMenu = () => {
		showDataMenu.set(!showDataMenu);
	};

	const generateIconImage = async (_layerEntry: GeoDataEntry): Promise<string | undefined> => {
		if (_layerEntry.type !== 'raster') {
			// raster タイプ以外の場合は undefined を返す
			return Promise.resolve(undefined);
		}
		// xyz タイル情報を取得
		const tile = _layerEntry.metaData.xyzImageTile
			? _layerEntry.metaData.xyzImageTile
			: IMAGE_TILE_XYZ;

		// URLを生成して Promise として返す
		return Promise.resolve(
			_layerEntry.format.url
				.replace('{z}', tile.z.toString())
				.replace('{x}', tile.x.toString())
				.replace('{y}', tile.y.toString())
		);
	};

	// 非同期で画像URLを取得
	const fetchTileImage = async (_layerEntry: GeoDataEntry) => {
		try {
			if (_layerEntry.type !== 'raster' || _layerEntry.format.type !== 'pmtiles') return;
			const tile = _layerEntry.metaData.xyzImageTile
				? _layerEntry.metaData.xyzImageTile
				: IMAGE_TILE_XYZ;
			return await getImagePmtiles(_layerEntry.format.url, tile);
		} catch (e) {
			console.error('Error fetching tile image:', e);
		}
	};

	const promise = async (layerEntry: GeoDataEntry) => {
		if (layerEntry.type === 'raster') {
			if (layerEntry.format.type === 'image') {
				return generateIconImage(layerEntry);
			} else if (layerEntry.format.type === 'pmtiles') {
				return fetchTileImage(layerEntry);
			}
		} else if (layerEntry.type === 'vector') {
			return layerEntry.metaData.coverImage ?? COVER_NO_IMAGE_PATH;
		}
	};

	const addData = (id: string) => {
		addedLayerIds.addLayer(id);
	};
	const deleteData = (id: string) => {
		addedLayerIds.removeLayer(id);
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
					<div
						class="relative mb-4 flex flex-col items-center justify-center rounded-lg bg-gray-300"
					>
						<button class="relative aspect-video overflow-hidden p-2">
							{#await promise(dataEntry) then url}
								<img
									src={url}
									class="css-no-drag-icon h-full w-full rounded-md object-cover"
									alt="サムネイル"
								/>
							{/await}
						</button>

						<div class="flex w-full items-center justify-start gap-2 p-2">
							<label
								class="relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-white"
							>
								<LayerIcon layerEntry={dataEntry} />
							</label>
							<span class="h-[30px] flex-shrink-0">{dataEntry.metaData.name}</span>
						</div>

						{#if addedDataIds.includes(dataEntry.id)}
							<button
								onclick={() => deleteData(dataEntry.id)}
								class="bg-main flex items-center justify-center rounded-full px-4"
							>
								<Icon icon="material-symbols:check" class=" h-8 w-8" />
								<div>地図に追加済み</div>
							</button>
						{:else}
							<button
								onclick={() => addData(dataEntry.id)}
								class="text-main bg-accent flex items-center justify-center rounded-full px-4"
							>
								<Icon icon="material-symbols:add" class=" h-8 w-8" />
								<div>地図に追加</div>
							</button>
						{/if}
					</div>
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

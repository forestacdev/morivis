<script lang="ts">
	import { slide } from 'svelte/transition';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/map/data/entries/raster';
	import { createVectorTileEntry } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import { registerMBTiles, type MBTilesMetadata } from '$routes/map/protocol/mbtiles';
	import type { DialogType } from '$routes/map/types';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let entryName = $state('');
	let analyzed = $state(false);
	let entryId = $state('');
	let metadata = $state<MBTilesMetadata | null>(null);

	// ベクター用
	let selectedLayerId = $state('');
	let geometryType = $state<VectorEntryGeometryType>('Polygon');

	const ALL_GEOMETRY_OPTIONS = [
		{ key: 'Point', name: 'ポイント' },
		{ key: 'LineString', name: 'ライン' },
		{ key: 'Polygon', name: 'ポリゴン' }
	];

	const geometryTypeOptions = $derived.by(() => {
		const layer = metadata?.vectorLayers.find((l) => l.id === selectedLayerId);
		if (!layer?.geometryType) return ALL_GEOMETRY_OPTIONS;
		const gt = layer.geometryType.toLowerCase();
		if (gt.includes('point')) return ALL_GEOMETRY_OPTIONS.filter((o) => o.key === 'Point');
		if (gt.includes('line')) return ALL_GEOMETRY_OPTIONS.filter((o) => o.key !== 'Polygon');
		return ALL_GEOMETRY_OPTIONS;
	});

	const mbtilesFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile).find((f) => /\.mbtiles$/i.test(f.name)) ?? null;
		}
		return dropFile;
	});

	$effect(() => {
		if (mbtilesFile) {
			entryName = mbtilesFile.name.replace(/\.[^.]+$/, '');
			analyzeMBTiles(mbtilesFile);
		}
	});

	const analyzeMBTiles = async (file: File) => {
		isProcessing.set(true);
		analyzed = false;
		metadata = null;
		selectedLayerId = '';

		try {
			const id = 'mbtiles_' + crypto.randomUUID();
			entryId = id;

			const meta = await registerMBTiles(id, file);
			metadata = meta;
			entryName = meta.name || entryName;

			// ベクターでレイヤーが1つなら自動選択
			if (meta.isVector && meta.vectorLayers.length === 1) {
				const layer = meta.vectorLayers[0];
				selectedLayerId = layer.id;
				// ジオメトリタイプを自動設定
				if (layer.geometryType) {
					const gt = layer.geometryType.toLowerCase();
					if (gt.includes('point')) geometryType = 'Point';
					else if (gt.includes('line')) geometryType = 'LineString';
					else if (gt.includes('polygon')) geometryType = 'Polygon';
				}
			}

			analyzed = true;

			// ラスターならそのまま登録
			if (!meta.isVector) {
				registration();
				return;
			}

			const typeLabel = meta.isVector ? 'ベクター (PBF)' : `ラスター (${meta.format})`;
			showNotification(`MBTiles: ${typeLabel}`, 'success');
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'MBTilesの解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const registration = () => {
		if (!analyzed || !entryId || !metadata) return;

		const tileUrl = `mbtiles://${entryId}/{z}/{x}/{y}`;
		const opts = {
			bounds: metadata.bounds,
			minZoom: metadata.minZoom,
			maxZoom: metadata.maxZoom
		};

		if (metadata.isVector) {
			if (!selectedLayerId) return;
			const entry = createVectorTileEntry(
				entryName || 'MBTiles',
				tileUrl,
				selectedLayerId,
				geometryType,
				undefined,
				{
					bounds: opts.bounds,
					minZoom: opts.minZoom,
					maxZoom: opts.maxZoom
				}
			);
			if (entry) {
				entry.format.type = 'mbtiles';
				showDataEntry = entry;
				showDialogType = null;
				dropFile = null;
			}
		} else {
			const entry = createRasterEntry(entryName || 'MBTiles', tileUrl, opts);
			if (entry) {
				(entry.format as { type: string }).type = 'mbtiles';
				showDataEntry = entry;
				showDialogType = null;
				dropFile = null;
			}
		}
	};

	const cancel = () => {
		showDialogType = null;
		dropFile = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">MBTilesの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if mbtilesFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {mbtilesFile.name}
		</div>
	{/if}

	{#if metadata}
		<div class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
			<div>タイプ: {metadata.isVector ? 'ベクター (PBF)' : `ラスター (${metadata.format})`}</div>
			{#if metadata.bounds}
				<div>
					範囲: [{metadata.bounds[0].toFixed(4)}, {metadata.bounds[1].toFixed(4)}, {metadata.bounds[2].toFixed(
						4
					)}, {metadata.bounds[3].toFixed(4)}]
				</div>
			{/if}
			{#if metadata.minZoom !== undefined && metadata.maxZoom !== undefined}
				<div>ズーム: {metadata.minZoom} 〜 {metadata.maxZoom}</div>
			{/if}
		</div>

		{#if metadata.isVector}
			{#if metadata.vectorLayers.length > 0}
				<div transition:slide class="w-full">
					<div class="flex flex-col gap-1">
						<label for="mbtiles-layer-select" class="text-sm text-gray-300"
							>ソースレイヤーを選択</label
						>
						<select
							id="mbtiles-layer-select"
							bind:value={selectedLayerId}
							onchange={() => {
								const layer = metadata?.vectorLayers.find((l) => l.id === selectedLayerId);
								if (layer?.geometryType) {
									const gt = layer.geometryType.toLowerCase();
									if (gt.includes('point')) geometryType = 'Point';
									else if (gt.includes('line')) geometryType = 'LineString';
									else if (gt.includes('polygon')) geometryType = 'Polygon';
								}
							}}
							class="bg-sub rounded border border-gray-600 p-2 text-white"
						>
							<option value="" disabled>選択してください</option>
							{#each metadata.vectorLayers as layer}
								<option value={layer.id}>
									{layer.id}
									{#if layer.geometryType}
										[{layer.geometryType}]{/if}
									{#if Object.keys(layer.fields).length > 0}
										({Object.keys(layer.fields).length}フィールド)
									{/if}
								</option>
							{/each}
						</select>
					</div>
				</div>
			{:else}
				<div transition:slide class="w-full">
					<TextForm bind:value={selectedLayerId} label="ソースレイヤー名" />
				</div>
			{/if}

			{#if selectedLayerId}
				<div transition:slide class="w-full p-2">
					<HorizontalSelectBox
						label="ジオメトリタイプ"
						bind:group={geometryType}
						options={geometryTypeOptions}
					/>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	{#if analyzed && metadata?.isVector}
		<button
			onclick={registration}
			disabled={$isProcessing || !selectedLayerId}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {$isProcessing || !selectedLayerId
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			決定
		</button>
	{/if}
</div>

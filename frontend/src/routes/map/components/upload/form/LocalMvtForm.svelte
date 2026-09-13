<script lang="ts">
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createVectorTileEntry } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import { registerLocalMvt, retainLocalMvtEntry } from '$routes/map/protocol/vector/local-mvt';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { inspectLocalMlt } from '$routes/map/utils/formats/mlt';
	import { inspectLocalMvt, type LocalMvtSource } from '$routes/map/utils/formats/mvt';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import {
		buildVectorTileFields,
		buildVectorTilePopupKeys,
		buildVectorTileTitles
	} from '$routes/map/utils/vector/tile-metadata';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();
	const files = $derived(toUploadFiles(dropFile));
	const format = $derived(showDialogType === 'local-mlt' ? 'mlt' : 'mvt');
	const formatLabel = $derived(format.toUpperCase());
	let source = $state.raw<LocalMvtSource | null>(null);
	let name = $state('');
	let selectedLayer = $state('');
	let geometry = $state<VectorEntryGeometryType>('Polygon');
	let loading = $state(true);
	let error = $state('');
	const geometryOptions = [
		{ key: 'Point', name: 'ポイント' },
		{ key: 'LineString', name: 'ライン' },
		{ key: 'Polygon', name: 'ポリゴン' }
	];
	const selectGeometry = () => {
		geometry =
			source?.layers.find((layer) => layer.id === selectedLayer)?.geometryTypes[0] ?? 'Polygon';
	};
	$effect(() => {
		const input = files;
		let active = true;
		source = null;
		loading = true;
		error = '';
		(format === 'mlt' ? inspectLocalMlt(input) : inspectLocalMvt(input))
			.then((result) => {
				if (!active) return;
				source = result;
				name = result.name;
				selectedLayer = result.layers[0].id;
				geometry = result.layers[0].geometryTypes[0] ?? 'Polygon';
			})
			.catch((cause) => {
				if (active) error = cause instanceof Error ? cause.message : String(cause);
			})
			.finally(() => {
				if (active) loading = false;
			});
		return () => {
			active = false;
		};
	});
	const register = () => {
		if (!source || !name.trim()) return;
		const layer = source.layers.find((item) => item.id === selectedLayer);
		if (!layer) return;
		const runtime = registerLocalMvt(source);
		try {
			const fields = buildVectorTileFields(layer.fields);
			const entry = createVectorTileEntry(name.trim(), runtime.url, layer.id, geometry, undefined, {
				format,
				bounds: source.bounds,
				minZoom: source.minZoom,
				maxZoom: source.maxZoom,
				fields,
				popupKeys: buildVectorTilePopupKeys(fields),
				titles: buildVectorTileTitles(fields, name.trim())
			});
			if (!entry) throw new Error(`${formatLabel}レイヤーを作成できませんでした。`);
			retainLocalMvtEntry(entry.id, runtime.url);
			showDataEntry = entry;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			runtime.dispose();
			error = cause instanceof Error ? cause.message : String(cause);
		}
	};
	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="c-scroll flex w-full grow flex-col gap-4 overflow-y-auto">
	{#if loading}<p role="status">タイルの構成を確認しています…</p>{/if}
	{#if source}
		<TextForm bind:value={name} label="データ名" />
		<p class="text-sm text-gray-300">
			{source.tiles.size.toLocaleString()}タイル・ズーム {source.minZoom}〜{source.maxZoom}
		</p>
		<label class="flex flex-col gap-2 text-sm">
			<span>ソースレイヤー</span>
			<select
				bind:value={selectedLayer}
				onchange={selectGeometry}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			>
				{#each source.layers as layer (layer.id)}<option value={layer.id}>{layer.id}</option>{/each}
			</select>
		</label>
		<HorizontalSelectBox label="描画する形状" bind:group={geometry} options={geometryOptions} />
		<p class="text-sm text-gray-400">表示範囲に応じて必要なタイルだけを読み込みます。</p>
		<p class="text-xs text-gray-400">再読み込み後は、フォルダをもう一度ドロップしてください。</p>
	{/if}
	{#if error}<p role="alert" class="text-sm text-red-300">{error}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={register}
		disabled={loading || !source || !selectedLayer || !name.trim()}
		class="c-btn-confirm min-w-[200px] p-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
		>登録</button
	>
</div>

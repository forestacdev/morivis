<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import type { TransformOptionMode } from './pending-zone-vector';
	import type { GeoRefData } from './transform/georef-types';

	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeoRefVectorSourceCache } from '$routes/map/utils/cache/georef-vector-source-cache';
	import { readDocxDrawings } from '$routes/map/utils/formats/docx';
	import type {
		OfficeDrawing,
		OfficeDrawingDocument
	} from '$routes/map/utils/formats/office-drawing';
	import { readPptxDrawings } from '$routes/map/utils/formats/pptx';
	import { featureCollectionToGeoRefData } from '$routes/map/utils/formats/vector/rasterize';
	import { drawingAppearanceToGeoRefData } from '$routes/map/utils/formats/xlsx/drawing-rasterize';
	import { getDefaultGeoRefCorners } from '$routes/map/utils/transform/georef/default-corners';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		geoRefData: GeoRefData | null;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	const file = $derived(dropFile ? getFirstUploadFile(dropFile) : null);
	const format = $derived(file?.name.toLowerCase().endsWith('.pptx') ? 'PowerPoint' : 'Word');
	let documentData = $state.raw<OfficeDrawingDocument | null>(null);
	let appearance = $state.raw<OfficeDrawing | null>(null);
	let selected = $state('');
	let readMode = $state<'image' | 'vector'>('image');
	const hasLines = $derived(!!appearance?.geometry.featureCollection.features.length);
	const canSubmit = $derived(readMode === 'image' ? !!appearance?.svg : hasLines);
	const bounds = $derived(
		hasLines && appearance ? turfBbox(appearance.geometry.featureCollection) : [0, 0, 1, 1]
	);
	const viewBox = $derived(
		`${bounds[0]} ${-bounds[3]} ${Math.max(1, bounds[2] - bounds[0])} ${Math.max(1, bounds[3] - bounds[1])}`
	);
	let loading = $state(false);
	let error = $state('');
	let request = 0;
	const previewUrl = $derived(
		appearance?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(appearance.svg)}` : ''
	);
	const entryName = $derived(
		`${file?.name.replace(/\.[^.]+$/, '') ?? format} - ${documentData?.items.find((item) => item.id === selected)?.name ?? ''}`
	);

	const selectDrawing = async (id: string) => {
		const current = ++request;
		selected = id;
		appearance = null;
		error = '';
		loading = true;
		try {
			const result = await documentData?.readDrawing(id);
			if (current === request) appearance = result ?? null;
		} catch (cause) {
			if (current === request)
				error = cause instanceof Error ? cause.message : '図面を読み込めませんでした';
		} finally {
			if (current === request) loading = false;
		}
	};

	$effect(() => {
		const source = file;
		if (!source) return;
		let active = true;
		untrack(() => {
			request++;
			loading = true;
			documentData = null;
			appearance = null;
			error = '';
			void (async () => {
				try {
					const bytes = await source.arrayBuffer();
					const result = await (source.name.toLowerCase().endsWith('.pptx')
						? readPptxDrawings(bytes)
						: readDocxDrawings(bytes));
					if (!active) return;
					documentData = result;
					if (result.items.length) await selectDrawing(result.items[0].id);
					else {
						error = '読み込める図面がありません。DrawingMLの図形・埋め込み画像に対応しています。';
						loading = false;
					}
				} catch (cause) {
					if (!active) return;
					error = cause instanceof Error ? cause.message : 'ファイルを読み込めませんでした';
					loading = false;
				}
			})();
		});
		return () => {
			active = false;
			request++;
		};
	});

	const openGeoRef = async () => {
		if (!appearance || !canSubmit || loading || $isProcessing) return;
		const current = appearance;
		const source = file;
		isProcessing.set(true);
		try {
			const width = Math.max(1, bounds[2] - bounds[0]);
			const height = Math.max(1, bounds[3] - bounds[1]);
			const scale = 1024 / Math.max(width, height);
			const data =
				readMode === 'image'
					? await drawingAppearanceToGeoRefData(current, entryName, format)
					: await featureCollectionToGeoRefData({
							featureCollection: current.geometry.featureCollection,
							entryName,
							width: Math.max(1, Math.round(width * scale)),
							height: Math.max(1, Math.round(height * scale))
						});
			if (
				appearance !== current ||
				file !== source ||
				!['pptx', 'docx'].includes(showDialogType ?? '')
			) {
				if (data.sourceFeatureCollectionId)
					GeoRefVectorSourceCache.remove(data.sourceFeatureCollectionId);
				return;
			}
			const map = mapStore.getMap();
			geoRefData = {
				...data,
				vectorLineWidth: 1,
				vectorAttribution: format,
				allowedTransformModes: ['georef'],
				initialCorners: map
					? getDefaultGeoRefCorners(map, data.imageWidth, data.imageHeight)
					: data.initialCorners
			};
			showDataEntry = null;
			transformOptionMode = 'georef';
			showDialogType = null;
		} catch (cause) {
			showNotification(
				cause instanceof Error ? cause.message : '位置合わせの準備に失敗しました',
				'error'
			);
		} finally {
			isProcessing.set(false);
		}
	};
</script>

<div class="shrink-0 pb-2 text-2xl font-bold">{format}図面の登録</div>
<div class="c-scroll flex min-h-0 grow flex-col gap-4 overflow-y-auto p-2">
	{#if file}<p class="break-all text-sm text-gray-300">{file.name}</p>{/if}
	{#if documentData?.items.length}
		<label for="office-drawing" class="text-sm text-gray-300">読み込む図面</label>
		<select
			id="office-drawing"
			value={selected}
			onchange={(event) => selectDrawing(event.currentTarget.value)}
			disabled={$isProcessing}
			class="bg-sub rounded border border-gray-600 p-2 text-white"
		>
			{#each documentData.items as item (item.id)}<option value={item.id}>{item.name}</option
				>{/each}
		</select>
	{/if}
	{#if loading}<p class="text-sm text-gray-400">図面を読み込み中...</p>{/if}
	{#if error}<p role="alert" class="text-sm text-red-400">{error}</p>{/if}
	{#if appearance}
		<label for="office-drawing-mode" class="text-sm text-gray-300">図面の読み込み方</label>
		<select
			id="office-drawing-mode"
			bind:value={readMode}
			disabled={$isProcessing}
			class="bg-sub rounded border border-gray-600 p-2 text-white"
		>
			<option value="image" disabled={!appearance.svg}>図面画像（塗り・線色・文字・画像）</option>
			<option value="vector" disabled={!hasLines}
				>オートシェイプの線（1px・図形ごとの属性付き）</option
			>
		</select>
		{#each appearance.warnings as warning (warning)}<p class="text-sm text-amber-300">
				{warning}
			</p>{/each}
		{#if readMode === 'image' && appearance.skippedImageCount}<p class="text-sm text-amber-300">
				未対応形式・外部参照・欠落などにより、{appearance.skippedImageCount}枚の画像を読み込めませんでした。
			</p>{/if}
		{#if readMode === 'vector'}
			{#if appearance.geometry.skippedShapeCount}
				<p class="text-sm text-amber-300">
					未対応の図形{appearance.geometry.skippedShapeCount}個は線に変換できませんでした。
				</p>
			{/if}
			{#if hasLines}
				<p class="text-sm text-gray-300">
					{appearance.geometry.shapeCount}個のオートシェイプを線として位置合わせします。
				</p>
				<svg
					{viewBox}
					class="max-h-[50vh] w-full rounded bg-white"
					role="img"
					aria-label="オートシェイプの輪郭プレビュー"
				>
					<g transform="scale(1,-1)" fill="none" stroke="#2563eb" stroke-width="1">
						{#each appearance.geometry.featureCollection.features as feature, index (index)}
							<polyline
								points={(feature.geometry.coordinates as number[][])
									.map((point) => point.join(','))
									.join(' ')}
								vector-effect="non-scaling-stroke"
							/>
						{/each}
					</g>
				</svg>
				<p class="text-xs text-gray-400">
					図形ごとの輪郭を1pxの線として登録し、名前と文字を属性に保存します。埋め込み画像・塗り・文字の見た目も残す場合は「図面画像」を選んでください。
				</p>
			{:else}<p class="text-sm text-gray-400">線に変換できるオートシェイプがありません。</p>{/if}
		{:else if previewUrl}
			<p class="text-sm text-gray-300">
				{appearance.shapeCount}個の図形と{appearance.imageCount}枚の画像をまとめて位置合わせします。
			</p>
			<img
				src={previewUrl}
				alt="図面のプレビュー"
				class="max-h-[50vh] w-full rounded bg-white object-contain"
			/>
			<p class="text-xs text-gray-400">塗り・線色・文字・画像を図面画像として登録します。</p>
		{:else}<p class="text-sm text-gray-400">この図面には読み込める図形・画像がありません。</p>{/if}
	{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-2">
	<button
		onclick={() => {
			request++;
			dropFile = null;
			showDialogType = null;
		}}
		class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button
	>
	<button
		onclick={openGeoRef}
		disabled={!canSubmit || loading || $isProcessing}
		class="c-btn-confirm cursor-pointer p-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
		>位置合わせへ</button
	>
</div>

<script lang="ts">
	import { parse } from '@loaders.gl/core';
	import { LASLoader } from '@loaders.gl/las';
	import { PCDLoader } from '@loaders.gl/pcd';
	import { PLYLoader } from '@loaders.gl/ply';
	import { untrack } from 'svelte';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createPointCloudEntry } from '$routes/map/data/entries/model';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { parseXyzFile } from '$routes/map/utils/formats/xyz';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformBbox } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { transformPointCloudParallel } from '$routes/map/utils/proj/pointcloud_transformer';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable()
	}: Props = $props();

	let entryName = $state('');
	let pointCount = $state<number | null>(null);
	let rawBbox = $state<[number, number, number, number] | null>(null);
	let resolvedBbox = $state<[number, number, number, number] | null>(null);
	let analyzed = $state(false);
	let parsedArrayBuffer = $state<ArrayBuffer | null>(null);
	let resolvedPositions = $state<Float32Array | null>(null);
	let resolvedColors = $state<Uint8Array | undefined>(undefined);
	let needsTransform = $state(false);

	const pointCloudFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile).find((f) => /\.(las|laz|ply|pcd|xyz)$/i.test(f.name)) ?? null;
		}
		return dropFile;
	});

	/** 拡張子に応じたLoaderを返す */
	const getLoader = (fileName: string) => {
		const ext = fileName.split('.').pop()?.toLowerCase();
		if (ext === 'ply') return PLYLoader;
		if (ext === 'pcd') return PCDLoader;
		return LASLoader;
	};

	$effect(() => {
		if (pointCloudFile) {
			entryName = pointCloudFile.name.replace(/\.[^.]+$/, '');
			analyzePointCloud(pointCloudFile);
		}
	});

	const isXyzFile = (fileName: string) => /\.xyz$/i.test(fileName);

	const analyzePointCloud = async (file: File) => {
		isProcessing.set(true);
		analyzed = false;
		pointCount = null;
		rawBbox = null;
		resolvedBbox = null;
		resolvedPositions = null;
		resolvedColors = undefined;
		needsTransform = false;

		try {
			let positions: Float32Array | null = null;
			let colors: Uint8Array | undefined = undefined;
			let bbox: [number, number, number, number] | null = null;

			if (isXyzFile(file.name)) {
				// XYZ テキスト形式
				const result = await parseXyzFile(file);
				positions = result.positions;
				colors = result.colors ?? undefined;
				pointCount = result.pointCount;

				if (pointCount > 0) {
					let minX = Infinity,
						minY = Infinity,
						maxX = -Infinity,
						maxY = -Infinity;
					for (let i = 0; i < positions.length; i += 3) {
						const x = positions[i],
							y = positions[i + 1];
						if (x < minX) minX = x;
						if (y < minY) minY = y;
						if (x > maxX) maxX = x;
						if (y > maxY) maxY = y;
					}
					bbox = [minX, minY, maxX, maxY];
				}
			} else {
				// LAS/LAZ/PLY/PCD (loaders.gl)
				const arrayBuffer = await file.arrayBuffer();
				parsedArrayBuffer = arrayBuffer.slice(0);

				const loader = getLoader(file.name);
				const data = await parse(arrayBuffer, loader);

				const pos = data.attributes?.POSITION?.value;
				if (pos) {
					positions = pos instanceof Float32Array ? pos : new Float32Array(pos);
					pointCount = positions.length / 3;
				}

				const col = data.attributes?.COLOR_0?.value;
				if (col) colors = col instanceof Uint8Array ? col : new Uint8Array(col);

				if (data.header?.boundingBox) {
					const [mins, maxs] = data.header.boundingBox;
					bbox = [mins[0], mins[1], maxs[0], maxs[1]];
				}
			}

			rawBbox = bbox;
			analyzed = true;

			if (rawBbox && isBboxValid(rawBbox)) {
				resolvedBbox = rawBbox;
				if (positions) resolvedPositions = positions;
				resolvedColors = colors;
			} else if (rawBbox) {
				needsTransform = true;
				if (positions) resolvedPositions = positions;
				resolvedColors = colors;
				showZoneForm = true;
				focusBbox = rawBbox;
			} else {
				showNotification('位置情報が取得できませんでした', 'error');
			}
		} catch (e) {
			showNotification(
				e instanceof Error ? e.message : '点群ファイルの解析に失敗しました',
				'error'
			);
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	// ZoneFormで座標系選択後 → 座標変換
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'pointcloud') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				transformWithEpsg(epsg);
			});
		}
	});

	const transformWithEpsg = async (epsgCode: EpsgCode) => {
		if (!rawBbox) return;

		isProcessing.set(true);

		try {
			// bbox変換
			const prjContent = getProjContext(epsgCode);
			const transformed = transformBbox(rawBbox, prjContent);

			if (!isBboxValid(transformed)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			resolvedBbox = transformed;

			// 点群座標を取得（XYZの場合は既にresolvedPositionsにある）
			let positions: Float32Array | null = resolvedPositions;

			if (!positions && parsedArrayBuffer) {
				// loaders.gl形式の場合は再パース
				const loader = pointCloudFile ? getLoader(pointCloudFile.name) : LASLoader;
				const data = await parse(parsedArrayBuffer.slice(0), loader);
				positions = data.attributes?.POSITION?.value as Float32Array;
				const col = data.attributes?.COLOR_0?.value;
				if (col) resolvedColors = col instanceof Uint8Array ? col : new Uint8Array(col);
			}

			if (!positions) {
				showNotification('点群座標の取得に失敗しました', 'error');
				return;
			}

			const transformedPositions = await transformPositions(positions, prjContent);

			resolvedPositions = transformedPositions;

			showNotification(
				`EPSG:${epsgCode} で座標変換しました（${pointCount?.toLocaleString()}点）`,
				'success'
			);

			// 変換完了後に自動登録
			registration();
		} catch (e) {
			showNotification(e instanceof Error ? e.message : '座標変換に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const transformPositions = transformPointCloudParallel;

	const registration = () => {
		if (!analyzed || !resolvedPositions || !resolvedBbox || !pointCount) return;

		const entry = createPointCloudEntry(
			entryName || '点群データ',
			{
				positions: resolvedPositions,
				colors: resolvedColors,
				pointCount
			},
			resolvedBbox
		);

		showDataEntry = entry;
		showDialogType = null;
		dropFile = null;
		parsedArrayBuffer = null;
		showNotification('点群ファイルを読み込みました', 'success');
	};

	const cancel = () => {
		resolvedPositions = null;
		resolvedColors = undefined;
		parsedArrayBuffer = null;
		showDialogType = null;
		dropFile = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">点群ファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if pointCloudFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {pointCloudFile.name}
		</div>
	{/if}

	{#if analyzed}
		<div class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
			{#if pointCount !== null}
				<div>点数: {pointCount.toLocaleString()}</div>
			{/if}
			{#if resolvedBbox}
				<div>
					範囲: [{resolvedBbox[0].toFixed(6)}, {resolvedBbox[1].toFixed(6)}, {resolvedBbox[2].toFixed(
						6
					)}, {resolvedBbox[3].toFixed(6)}]
				</div>
			{:else if rawBbox && needsTransform}
				<div class="text-yellow-400">座標系が不明です。投影法を選択してください。</div>
				<div class="text-xs text-gray-500">
					元の範囲: [{rawBbox[0].toFixed(2)}, {rawBbox[1].toFixed(2)}, {rawBbox[2].toFixed(2)}, {rawBbox[3].toFixed(
						2
					)}]
				</div>
			{/if}
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={registration}
		disabled={!analyzed || !resolvedBbox || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!analyzed || !resolvedBbox || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>

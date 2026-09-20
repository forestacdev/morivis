<script lang="ts">
	import { onDestroy } from 'svelte';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import { createGaussianSplatEntry } from '$routes/map/data/entries/model';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import {
		getGaussianSplatRenderBounds,
		inspectGaussianSplatPlyFile,
		type GaussianSplatPlyInspection
	} from '$routes/map/utils/formats/gaussian-splat';
	import {
		removeGaussianSplatData,
		setGaussianSplatData
	} from '$routes/map/utils/formats/gaussian-splat/cache';
	import { parseGaussianSplatInWorker } from '$routes/map/utils/formats/gaussian-splat/gaussian-splat-parallel';
	import { inspectSpzFile } from '$routes/map/utils/formats/spz';
	import { getModelGeoBoundsFromLocalBounds } from '$routes/map/utils/three/model-geo-bounds';
	import {
		getInitialModelPlacementScale,
		getInitialModelPlacementViewport
	} from '$routes/map/utils/three/model-initial-scale';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	const splatFile = $derived(getFirstUploadFile(dropFile));
	let inspection = $state<GaussianSplatPlyInspection | null>(null);
	let name = $state('');
	let inspectionError = $state('');
	const encoding = $derived(splatFile?.name.toLowerCase().endsWith('.spz') ? 'spz' : 'ply');
	let parseController: AbortController | undefined;
	onDestroy(() => parseController?.abort());

	$effect(() => {
		if (!splatFile) return;
		inspection = null;
		inspectionError = '';
		let active = true;
		name = splatFile.name.replace(/\.[^.]+$/, '') || splatFile.name;
		isProcessing.set(true);
		void (encoding === 'spz' ? inspectSpzFile(splatFile) : inspectGaussianSplatPlyFile(splatFile))
			.then(async (result) => {
				if (!active) return;
				inspection = result;
				if (encoding === 'spz' && result.kind === 'gaussian-splat') {
					isProcessing.set(false);
					await register();
				}
			})
			.catch((error) => {
				if (active)
					inspectionError =
						error instanceof Error ? error.message : 'ファイルを確認できませんでした。';
			})
			.finally(() => {
				if (active) isProcessing.set(false);
			});
		return () => {
			active = false;
			parseController?.abort();
			isProcessing.set(false);
		};
	});

	const cancel = () => {
		parseController?.abort();
		isProcessing.set(false);
		transformOptionMode = null;
		focusBbox = null;
		showDialogType = null;
		dropFile = null;
	};

	const register = async () => {
		if ($isProcessing || !splatFile || inspection?.kind !== 'gaussian-splat') return;
		if (!name.trim()) {
			showNotification('データ名を入力してください', 'warning');
			return;
		}

		inspectionError = '';
		isProcessing.set(true);
		const file = splatFile;
		const sourceEncoding = encoding;
		const metadata = inspection;
		parseController = new AbortController();
		const controller = parseController;
		let url: string | undefined;
		let entryId: string | undefined;
		try {
			// 解析中の地図移動に左右されないよう、配置開始時の位置と画面を使う。
			const center = mapStore.getCenter();
			const map = mapStore.getMap();
			const viewport = map ? getInitialModelPlacementViewport(map) : undefined;
			const data = await parseGaussianSplatInWorker(
				await file.arrayBuffer(),
				sourceEncoding,
				controller.signal
			);
			if (controller.signal.aborted || splatFile !== file) return;
			url = URL.createObjectURL(file);
			const entry = createGaussianSplatEntry(
				name.trim(),
				url,
				{
					lng: center?.lng ?? 0,
					lat: center?.lat ?? 0,
					altitude: 0
				},
				{
					gaussianSplat: {
						splatCount: metadata.splatCount,
						shDegree: metadata.shDegree
					}
				},
				sourceEncoding
			);
			entryId = entry.id;
			entry.format.sourceFileName = file.name;
			entry.format.localBounds = getGaussianSplatRenderBounds(data.bounds);
			if (viewport) {
				Object.assign(
					entry.style.transform,
					getInitialModelPlacementScale(entry.format.localBounds, viewport, entry.style.transform)
				);
			}
			entry.metaData.bounds = getModelGeoBoundsFromLocalBounds(
				entry.format.localBounds,
				entry.style
			);
			setGaussianSplatData(entry.id, data);
			showDataEntry = entry;
			transformOptionMode = 'georef';
		} catch (error) {
			if (url) URL.revokeObjectURL(url);
			if (entryId) removeGaussianSplatData(entryId);
			if (!controller.signal.aborted && splatFile === file) {
				inspectionError =
					error instanceof Error ? error.message : 'ファイルを読み込めませんでした。';
				showNotification(inspectionError, 'error');
			}
		} finally {
			if (parseController === controller && splatFile === file) isProcessing.set(false);
		}
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">3D Gaussian Splatting の登録</span>
</div>

{#if splatFile}
	<div class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-x-hidden overflow-y-auto">
		<div class="rounded-md bg-black/15 p-3 text-sm text-gray-200">
			<p>{splatFile.name}</p>
			{#if inspectionError}
				<p class="mt-2 text-red-300">{inspectionError}</p>
			{:else if encoding === 'spz'}
				<p class="mt-2">読み込んでいます…</p>
			{:else if inspection?.kind === 'gaussian-splat'}
				<p class="mt-2">
					{inspection.splatCount.toLocaleString()} splats / SH {inspection.shDegree}次
				</p>
				<p class="mt-2">登録後に地図上の配置位置を指定します。</p>
			{:else if inspection?.kind === 'super-splat'}
				<p class="mt-2 text-red-300">
					SuperSplat 圧縮 PLY は未対応です。通常 PLY に書き出してください。
				</p>
			{:else if inspection?.kind === 'other-ply'}
				<p class="mt-2 text-red-300">3D Gaussian Splatting の通常 PLY 属性が見つかりません。</p>
			{:else}
				<p class="mt-2">ファイルを確認しています。</p>
			{/if}
		</div>

		{#if encoding !== 'spz'}
			<TextForm label="データ名" bind:value={name} />
		{/if}

		<div class="mt-auto flex justify-end gap-2 pb-2">
			<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
			{#if encoding !== 'spz' || (inspectionError && inspection?.kind === 'gaussian-splat')}
				<button
					class="c-btn-confirm rounded-lg px-4 py-2"
					disabled={$isProcessing || inspection?.kind !== 'gaussian-splat' || !name.trim()}
					onclick={register}
				>
					{encoding === 'spz' ? '再試行' : '配置位置を指定'}
				</button>
			{/if}
		</div>
	</div>
{:else}
	<p class="text-sm text-red-300">3D Gaussian Splatting ファイルが見つかりません。</p>
{/if}

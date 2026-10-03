<script lang="ts">
	import { untrack } from 'svelte';

	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { hasFormatExtension } from '$routes/map/utils/formats/format-definition';
	import {
		inspectVtkFileInWorker,
		vtkFileToGlbInWorker
	} from '$routes/map/utils/formats/vtk/analyze';
	import { formatVtk } from '$routes/map/utils/formats/vtk/definition';
	import type { VtkRenderOptions, VtkSummary } from '$routes/map/utils/formats/vtk/types';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	const files = $derived(
		toUploadFiles(dropFile).filter((file) => hasFormatExtension(file.name, formatVtk.extensions))
	);
	let selectedIndex = $state(0);
	const file = $derived(files[selectedIndex] ?? files[0]);
	let inspected = $state.raw<{ file: File; summary: VtkSummary } | null>(null);
	const summary = $derived(inspected && inspected.file === file ? inspected.summary : null);
	let scalarId = $state<string | null>(null);
	const scalar = $derived(summary?.scalars.find((item) => item.id === scalarId));
	let upAxis = $state<VtkRenderOptions['upAxis']>('z');
	let unitScale = $state(1);
	let errorMessage = $state('');
	let loading = $state<'inspect' | 'convert' | null>(null);
	let controller: AbortController | undefined;

	const inspect = async (input: File | undefined) => {
		controller?.abort();
		controller = undefined;
		inspected = null;
		scalarId = null;
		errorMessage = '';
		loading = null;
		if (!input) return;
		const request = new AbortController();
		controller = request;
		loading = 'inspect';
		try {
			const result = await inspectVtkFileInWorker(input, request.signal);
			if (request.signal.aborted || file !== input) return;
			inspected = { file: input, summary: result };
		} catch (error) {
			if (!request.signal.aborted && file === input)
				errorMessage = error instanceof Error ? error.message : 'VTKを解析できませんでした';
		} finally {
			if (controller === request) {
				controller = undefined;
				loading = null;
			}
		}
	};

	// 選択ファイルにWorkerの処理を同期し、切替・画面破棄で中断する。
	$effect(() => {
		const input = file;
		untrack(() => void inspect(input));
		return () => controller?.abort();
	});

	const convert = async () => {
		if (!file || !summary || loading) return;
		const input = file;
		const request = new AbortController();
		controller = request;
		loading = 'convert';
		errorMessage = '';
		try {
			const glb = await vtkFileToGlbInWorker(
				input,
				{ scalarId, upAxis, unitScale },
				request.signal
			);
			if (request.signal.aborted || file !== input) return;
			dropFile = [
				new File([glb], input.name.replace(/\.[^.]+$/, '') + '.glb', { type: 'model/gltf-binary' })
			];
			showDialogType = 'model';
		} catch (error) {
			if (!request.signal.aborted && file === input)
				errorMessage = error instanceof Error ? error.message : 'VTKを読み込めませんでした';
		} finally {
			if (controller === request) {
				controller = undefined;
				loading = null;
			}
		}
	};

	const cancel = () => {
		controller?.abort();
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">VTK</div>
<div class="flex flex-col gap-4 text-sm">
	{#if files.length > 1}
		<label class="flex flex-col gap-2">
			読み込むファイル
			<select class="rounded bg-zinc-800 p-2" bind:value={selectedIndex}>
				{#each files as item, index (item)}
					<option value={index}>{item.name}</option>
				{/each}
			</select>
		</label>
	{:else}
		<p class="break-all">{file?.name ?? 'ファイルがありません。'}</p>
	{/if}
	<p>表面メッシュと体積メッシュの外表面を読み込みます。点・線だけのデータは対象外です。</p>
	{#if summary}
		<p>
			{summary.pointCount.toLocaleString()} 頂点・{summary.cellCount.toLocaleString()}
			セル・表示する三角形 {summary.triangleCount.toLocaleString()} 面
		</p>
		{#if summary.ignoredCellCount > 0}
			<p class="text-amber-200">
				点・線などの {summary.ignoredCellCount.toLocaleString()} セルは表示対象から除外されます。
			</p>
		{/if}
		<label class="flex flex-col gap-2">
			色分けに使う解析値
			<select class="rounded bg-zinc-800 p-2" bind:value={scalarId} disabled={!!loading}>
				<option value={null}>色分けなし</option>
				{#each summary.scalars as item (item.id)}
					<option value={item.id}>
						{item.name}（{item.association === 'point' ? '頂点' : 'セル'}）
					</option>
				{/each}
			</select>
		</label>
		{#if scalar}
			<div>
				<div class="scalar-gradient h-3 rounded" aria-hidden="true"></div>
				<div class="mt-1 flex justify-between gap-4">
					<span>最小 {scalar.min}</span><span>最大 {scalar.max}</span>
				</div>
				<p class="mt-2">欠損値は灰色で表示します。</p>
			</div>
		{:else if summary.scalars.length === 0}
			<p>色分けに使えるスカラー値はありません。</p>
		{/if}
		<label class="flex flex-col gap-2">
			モデルの上方向
			<select class="rounded bg-zinc-800 p-2" bind:value={upAxis} disabled={!!loading}>
				<option value="z">Z-up</option>
				<option value="y">Y-up</option>
			</select>
		</label>
		<label class="flex flex-col gap-2">
			座標の単位
			<select class="rounded bg-zinc-800 p-2" bind:value={unitScale} disabled={!!loading}>
				<option value={1}>メートル（m）</option>
				<option value={0.01}>センチメートル（cm）</option>
				<option value={0.001}>ミリメートル（mm）</option>
			</select>
		</label>
		<p>色分けは読み込み時に確定します。次の画面で地図上の位置・回転・大きさを調整できます。</p>
	{/if}
	{#if errorMessage}<p class="text-red-300" role="alert">{errorMessage}</p>{/if}
	{#if loading}
		<p role="status">
			{loading === 'inspect' ? 'VTKを解析しています…' : '3Dモデルを作成しています…'}
		</p>
	{/if}
	<div class="flex justify-end gap-2">
		<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
		{#if summary}
			<button class="c-btn-confirm rounded-lg px-4 py-2" onclick={convert} disabled={!!loading}>
				読み込み
			</button>
		{/if}
	</div>
</div>

<style>
	.scalar-gradient {
		background: linear-gradient(to right, blue, cyan, lime, yellow, red);
	}
</style>

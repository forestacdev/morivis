<script lang="ts">
	import { onDestroy } from 'svelte';

	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { cadFileToGlbInWorker } from '$routes/map/utils/formats/step-iges/analyze';
	import type { CadUpAxis } from '$routes/map/utils/formats/step-iges/types';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	const files = $derived(
		toUploadFiles(dropFile).filter((file) => /\.(step|stp|iges|igs)$/i.test(file.name))
	);
	let selectedIndex = $state(0);
	const file = $derived(files[selectedIndex] ?? files[0]);
	let upAxis = $state<CadUpAxis>('z');
	let errorMessage = $state('');
	let loading = $state(false);
	let controller: AbortController | undefined;
	onDestroy(() => controller?.abort());

	const convert = async () => {
		if (!file || loading) return;
		const input = file;
		const request = new AbortController();
		controller = request;
		loading = true;
		errorMessage = '';
		try {
			const glb = await cadFileToGlbInWorker(input, upAxis, request.signal);
			if (request.signal.aborted) return;
			dropFile = [
				new File([glb], input.name.replace(/\.[^.]+$/, '') + '.glb', { type: 'model/gltf-binary' })
			];
			showDialogType = 'model';
		} catch (error) {
			if (!request.signal.aborted)
				errorMessage = error instanceof Error ? error.message : 'STEP／IGESを読み込めませんでした';
		} finally {
			if (!request.signal.aborted) loading = false;
		}
	};
	const cancel = () => {
		controller?.abort();
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">STEP／IGES</div>
<div class="flex flex-col gap-4 text-sm">
	{#if files.length > 1}
		<label class="flex flex-col gap-2"
			>読み込むファイル
			<select class="rounded bg-zinc-800 p-2" bind:value={selectedIndex} disabled={loading}>
				{#each files as item, index (item)}<option value={index}>{item.name}</option>{/each}
			</select>
		</label>
	{:else}<p>{file?.name ?? 'ファイルがありません。'}</p>{/if}
	<label class="flex flex-col gap-2"
		>モデルの上方向
		<select class="rounded bg-zinc-800 p-2" bind:value={upAxis} disabled={loading}>
			<option value="z">Z-up（CAD）</option>
			<option value="y">Y-up（3Dモデル）</option>
		</select>
	</label>
	<p>面・立体の形状、色、部品名を読み込みます。寸法注記や線・点だけのデータは対象外です。</p>
	<p>
		ファイルの単位をメートルへ換算します。読み込み後に地図上で位置・回転・大きさを調整できます。
	</p>
	{#if errorMessage}<p class="text-red-300" role="alert">{errorMessage}</p>{/if}
	{#if loading}<p role="status">3Dモデルを読み込んでいます…</p>{/if}
	<div class="flex justify-end gap-2">
		<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
		<button class="c-btn-confirm rounded-lg px-4 py-2" onclick={convert} disabled={!file || loading}
			>読み込み</button
		>
	</div>
</div>

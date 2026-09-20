<script lang="ts">
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { robloxFileToGlbInWorker } from '$routes/map/utils/formats/roblox/analyze';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	const file = $derived(getFirstUploadFile(dropFile));
	let errorMessage = $state('');
	let retry = $state(0);

	$effect(() => {
		const input = file;
		void retry;
		if (!input || !/\.rbxlx?$/i.test(input.name)) return;
		const controller = new AbortController();
		errorMessage = '';
		void robloxFileToGlbInWorker(input, controller.signal)
			.then((result) => {
				if (controller.signal.aborted) return;
				dropFile = [
					new File([result.glb], input.name.replace(/\.rbxlx?$/i, '') + '.glb', {
						type: 'model/gltf-binary'
					})
				];
				showDialogType = 'model';
				if (result.warnings.length) {
					showNotification(
						`パーツを読み込みました。省略・取得失敗: ${result.warnings.join('、')}`,
						'warning'
					);
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted)
					errorMessage =
						error instanceof Error ? error.message : 'ワールドを読み込めませんでした。';
			});
		return () => controller.abort();
	});
	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">Robloxのワールド</div>
<div class="flex flex-col gap-4 text-sm">
	<p>{file?.name ?? 'ファイルがありません。'}</p>
	{#if errorMessage}
		<p class="text-red-300" role="alert">{errorMessage}</p>
	{:else if file}
		<p role="status">読み込んでいます…</p>
	{/if}
	<div class="flex justify-end gap-2">
		<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
		{#if errorMessage}
			<button class="c-btn-confirm rounded-lg px-4 py-2" onclick={() => retry++}>再試行</button>
		{/if}
	</div>
</div>

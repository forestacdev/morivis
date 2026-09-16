<script lang="ts">
	import { onDestroy, untrack } from 'svelte';

	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { analyzeBdsFiles } from '$routes/map/utils/formats/bds/analyze';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	let busy = $state(false);
	let errorMessage = $state('');
	let active = true;
	let attemptedInput: UploadFilesInput;
	const files = $derived(toUploadFiles(dropFile));
	const valid = $derived(files.length > 0 && files.every((file) => /\.bds$/i.test(file.name)));
	onDestroy(() => {
		active = false;
	});
	const read = async () => {
		if (!valid || busy) return;
		const inputs = [...files];
		busy = true;
		errorMessage = '';
		isProcessing.set(true);
		try {
			const { geojson, emptyFiles } = await analyzeBdsFiles(inputs);
			if (!active) return;
			const name =
				inputs.length === 1
					? inputs[0].name.replace(/\.bds$/i, '')
					: `BDS（${inputs.length}ファイル）`;
			// 変換後は既存のGeoJSONフォームへ渡し、図形種別の選択とentry生成を共通化する。
			dropFile = new File([JSON.stringify(geojson)], `${name}.geojson`, {
				type: 'application/geo+json'
			});
			showDialogType = 'geojson';
			if (emptyFiles.length)
				showNotification(`図形が空のファイル: ${emptyFiles.join('、')}`, 'warning');
		} catch (error) {
			if (active)
				errorMessage = error instanceof Error ? error.message : 'BDSの読み込みに失敗しました';
		} finally {
			busy = false;
			isProcessing.set(false);
		}
	};
	$effect(() => {
		if (!valid || busy || dropFile === attemptedInput) return;
		attemptedInput = dropFile;
		untrack(() => void read());
	});
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">BDSファイルの登録</div>
<div class="c-scroll flex grow flex-col gap-4 overflow-y-auto p-2 text-sm">
	<p>
		SISのBDSから線・境界線・文字位置と属性を読み込みます。塗りや文字の書式は再現せず、曲線は端点を結ぶ直線として表示します。
	</p>
	<p>
		対応する図形・座標系は一部に限られます。複数の図形種別がある場合は、読み込み後に表示する種別を選択します。
	</p>
	<label class="flex flex-col gap-2">
		<span>BDSファイルを選択（複数可）</span>
		<input
			type="file"
			accept=".bds"
			multiple
			disabled={busy}
			onchange={(event) => {
				dropFile = Array.from(event.currentTarget.files ?? []);
				errorMessage = '';
			}}
		/>
	</label>
	{#if busy}<p role="status">BDSを読み込んでいます…</p>{/if}
	{#if files.length && !valid}<p role="alert">.bdsファイルだけを選択してください。</p>{/if}
	{#if errorMessage}<p role="alert" class="text-red-300">{errorMessage}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button
		class="c-btn-sub p-4 text-lg"
		disabled={busy}
		onclick={() => {
			dropFile = null;
			showDialogType = null;
		}}>キャンセル</button
	>
	{#if errorMessage}<button
			class="c-btn-confirm p-4 text-lg"
			disabled={!valid || busy}
			onclick={read}>再試行</button
		>{/if}
</div>

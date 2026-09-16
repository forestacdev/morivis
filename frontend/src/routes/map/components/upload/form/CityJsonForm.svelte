<script lang="ts">
	import { untrack } from 'svelte';

	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { cityJsonFilesToGeoJsonInWorker } from '$routes/map/utils/formats/cityjson/analyze';
	import { createCityJsonEntry } from '$routes/map/utils/formats/cityjson/entry';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';

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
	let crs = $state('');
	let busy = $state(false);
	let errorMessage = $state('');
	let conversion: AbortController | null = null;

	const close = () => {
		conversion?.abort();
		dropFile = null;
		showDialogType = null;
	};
	const register = async () => {
		if (!files.length) return;
		conversion?.abort();
		const controller = new AbortController();
		conversion = controller;
		const inputs = [...files];
		busy = true;
		errorMessage = '';
		try {
			const result = await cityJsonFilesToGeoJsonInWorker(inputs, { crs }, controller.signal);
			if (controller.signal.aborted) return;
			const name =
				inputs.length === 1
					? inputs[0].name.replace(/\.(?:city\.json|cityjson|json)$/i, '')
					: `CityJSON（${inputs.length}ファイル）`;
			showDataEntry = createCityJsonEntry(name, result);
			close();
			const notes = [
				result.skippedGeometryCount
					? `面・立体以外の形状${result.skippedGeometryCount}件を除外`
					: '',
				result.hasAppearance ? '色・テクスチャは未反映' : ''
			].filter(Boolean);
			showNotification(
				`${result.geojson.features.length.toLocaleString()}件の都市オブジェクトを読み込みました${notes.length ? `（${notes.join('、')}）` : ''}`,
				notes.length ? 'warning' : 'success'
			);
		} catch (error) {
			if (!controller.signal.aborted)
				errorMessage = error instanceof Error ? error.message : 'CityJSONの読み込みに失敗しました';
		} finally {
			if (conversion === controller) busy = false;
		}
	};
	// ファイルの差し替え・ダイアログ破棄で前のWorkerを終了する。
	$effect(() => {
		if (!files.length) return;
		untrack(() => void register());
		return () => conversion?.abort();
	});
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">CityJSONファイルの登録</div>
<div class="c-scroll flex grow flex-col gap-4 overflow-y-auto p-2 text-sm">
	<p>
		建物や地形などの面・立体形状と属性を読み込みます。各オブジェクトの最も詳細なLODを使い、自動で3Dプレビューを開きます。
	</p>
	<p>色・テクスチャ、点・線の形状は再現しません。高さは元データの値を使います。</p>
	<label class="flex flex-col gap-2">
		<span>CityJSONファイルを選択（複数可）</span>
		<input
			type="file"
			accept=".city.json,.cityjson,.json"
			multiple
			disabled={busy}
			onchange={(event) => {
				dropFile = Array.from(event.currentTarget.files ?? []);
			}}
		/>
	</label>
	{#if files.length}
		<ul class="list-inside list-disc">
			{#each files as file, index (`${index}:${file.name}`)}<li>{file.name}</li>{/each}
		</ul>
	{/if}
	<label class="flex flex-col gap-2">
		<span>水平座標系（空欄でファイルから取得）</span>
		<input
			class="c-input w-full"
			type="text"
			bind:value={crs}
			disabled={busy}
			placeholder="EPSG:6677 または +proj=…"
			aria-describedby="cityjson-crs-help"
		/>
	</label>
	<p id="cityjson-crs-help">
		座標系が不明・未対応の場合に指定してください。複数ファイルを選ぶと、すべてに同じ指定を使います。
	</p>
	{#if errorMessage}<p role="alert" class="text-red-300">{errorMessage}</p>{/if}
	{#if busy}<p role="status">CityJSONを読み込み中…</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={close} class="c-btn-sub p-4 text-lg">キャンセル</button>
	<button
		onclick={() => void register()}
		disabled={!files.length || busy}
		class="c-btn-confirm min-w-[200px] p-4 text-lg"
	>
		{busy ? '読み込み中…' : '読み込む'}
	</button>
</div>

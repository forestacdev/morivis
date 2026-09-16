<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { onDestroy, untrack } from 'svelte';

	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { analyzeGcdFiles } from '$routes/map/utils/formats/gcd/analyze';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

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
	let busy = $state(false);
	let errorMessage = $state('');
	let active = true;
	onDestroy(() => {
		active = false;
	});
	const files = $derived(toUploadFiles(dropFile));
	const valid = $derived(files.length > 0 && files.every((file) => /\.gcd$/i.test(file.name)));
	let attemptedInput: UploadFilesInput;
	$effect(() => {
		if (!valid || busy || dropFile === attemptedInput) return;
		attemptedInput = dropFile;
		untrack(() => void register());
	});
	const close = () => {
		dropFile = null;
		showDialogType = null;
	};
	const register = async () => {
		if (!valid || busy) return;
		const inputs = [...files];
		busy = true;
		errorMessage = '';
		isProcessing.set(true);
		try {
			const geojson = (await analyzeGcdFiles(inputs)) as FeatureCollection;
			if (!active) return;
			const bounds = turfBbox(geojson) as [number, number, number, number];
			if (!isBboxValid(bounds)) throw new Error('GCDの座標変換結果が範囲外です');
			const name =
				inputs.length === 1
					? inputs[0].name.replace(/\.gcd$/i, '')
					: `GCD（${inputs.length}ファイル）`;
			const entry = await createGeoJsonEntry(geojson, 'LineString', name, bounds, undefined, {
				attribution: 'GCD'
			});
			if (!active) return;
			if (!entry) throw new Error('GCDのレイヤーを作成できませんでした');
			entry.metaData.description =
				'GCDファイルから抽出した図形の境界線と属性。地図上で図形の位置と属性を確認するために利用できる。';
			showDataEntry = entry;
			close();
			showNotification(
				`${geojson.features.length.toLocaleString()}件の図形を読み込みました`,
				'success'
			);
		} catch (error) {
			if (active)
				errorMessage = error instanceof Error ? error.message : 'GCDの読み込みに失敗しました';
		} finally {
			busy = false;
			isProcessing.set(false);
		}
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">GCDファイルの登録</div>
<div class="c-scroll flex grow flex-col gap-4 overflow-y-auto p-2 text-sm">
	<p>
		GCD内の図形と属性を読み込みます。図形は頂点を直線で結んだ境界線として表示し、塗り・記号・曲線の表現は再現しません。
	</p>
	<label class="flex flex-col gap-2">
		<span>GCDファイルを選択（複数可）</span>
		<input
			type="file"
			accept=".gcd"
			multiple
			disabled={busy}
			onchange={(event) => {
				dropFile = Array.from(event.currentTarget.files ?? []);
				errorMessage = '';
			}}
		/>
	</label>
	{#if files.length}
		<ul class="list-inside list-disc">
			{#each files as file, index (`${index}:${file.name}`)}<li>{file.name}</li>{/each}
		</ul>
		{#if files.length > 1}<p>1つのレイヤーにまとめ、元のファイル名を属性に追加します。</p>{/if}
	{/if}
	{#if files.length && !valid}<p role="alert">.gcdファイルだけを選択してください。</p>{/if}
	{#if errorMessage}<p role="alert" class="text-red-300">{errorMessage}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={close} disabled={busy} class="c-btn-sub p-4 text-lg">キャンセル</button>
	<button
		onclick={register}
		disabled={!valid || busy}
		class="c-btn-confirm min-w-[200px] p-4 text-lg">{busy ? '読み込み中…' : '読み込む'}</button
	>
</div>

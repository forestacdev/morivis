<script lang="ts">
	import { beginUploadProcessing } from '../processing-guard';
	import type { TransformOptionMode } from './pending-zone-vector';
	import type { GeoRefData } from './transform/georef-types';

	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { readVideoFile } from '$routes/map/utils/formats/video/read';
	import { getDefaultGeoRefCorners } from '$routes/map/utils/transform/georef/default-corners';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { mapStore } from '$routes/stores/map';

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
	let error = $state('');
	const file = $derived(getFirstUploadFile(dropFile));

	$effect(() => {
		if (!file) return;
		const source = file;
		const controller = new AbortController();
		const release = beginUploadProcessing(controller.signal);
		error = '';
		void (async () => {
			try {
				const data = await readVideoFile(source, controller.signal);
				if (controller.signal.aborted) return;
				const map = mapStore.getMap();
				geoRefData = {
					...data,
					initialCorners: map
						? getDefaultGeoRefCorners(map, data.imageWidth, data.imageHeight)
						: undefined
				};
				showDataEntry = null;
				transformOptionMode = 'georef';
				showDialogType = null;
			} catch (cause) {
				if (!controller.signal.aborted)
					error = cause instanceof Error ? cause.message : '動画を読み込めませんでした';
			} finally {
				release();
			}
		})();
		return () => controller.abort();
	});
</script>

<div class="pb-3 text-2xl font-bold">動画の登録</div>
{#if error}
	<p role="alert" class="text-red-400">{error}</p>
{:else if file}
	<p>位置合わせ用のフレームを読み込んでいます。</p>
{:else}
	<p>動画ファイルをドロップしてください（MP4・WebM・MOV・M4V・OGV）。</p>
{/if}
<p class="py-3 text-sm text-gray-400">
	先頭フレームで位置合わせした後、動画を無音でループ再生します。
</p>
<button
	class="c-btn-sub p-3"
	onclick={() => {
		dropFile = null;
		showDialogType = null;
	}}>キャンセル</button
>

<script lang="ts">
	import type { DialogType } from '$routes/map/types';

	interface Props {
		showDialogType: DialogType;
		pendingTileUrl: string | null;
		remoteRasterUrl: string | null;
		remoteVectorUrl: string | null;
	}

	let {
		showDialogType = $bindable(),
		pendingTileUrl = $bindable(),
		remoteRasterUrl = $bindable(),
		remoteVectorUrl = $bindable()
	}: Props = $props();

	const openRasterForm = () => {
		if (!pendingTileUrl) return;
		remoteRasterUrl = pendingTileUrl;
		pendingTileUrl = null;
		showDialogType = 'raster';
	};

	const openVectorForm = () => {
		if (!pendingTileUrl) return;
		remoteVectorUrl = pendingTileUrl;
		pendingTileUrl = null;
		showDialogType = 'vector';
	};

	const cancel = () => {
		pendingTileUrl = null;
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">タイル種別の選択</span>
</div>

<div class="flex h-full w-full grow flex-col justify-center gap-4 overflow-x-hidden overflow-y-auto">
	<p class="text-sm text-gray-300">
		URLの拡張子からタイル種別を判定できませんでした。画像タイルかベクタータイルかを選択してください。
	</p>
	<div class="bg-sub rounded-lg p-3 text-xs break-all text-gray-400">
		{pendingTileUrl}
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button onclick={openRasterForm} class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg">
		XYZラスターフォーム
	</button>
	<button onclick={openVectorForm} class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg">
		ベクタータイルフォーム
	</button>
</div>

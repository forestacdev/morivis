<script lang="ts">
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		dropFile: File | FileList | null;
		showDialogType: DialogType;
	}

	let {
		showDataEntry = $bindable(),
		dropFile = $bindable(),
		showDialogType = $bindable()
	}: Props = $props();

	const inputFile = (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			dropFile = file;
		}
	};

	const showUploadDialog = (type: DialogType) => {
		showDialogType = type;
	};
	let isDragover = $state(false);

	// ドラッグ中のイベント
	const dragover: (e: DragEvent) => void = (e) => {
		e.preventDefault();
		isDragover = true;
	};
	const dragleave: (e: DragEvent) => void = (e) => {
		e.preventDefault();
		isDragover = false;
	};
	// ドロップ完了時にファイルを取得
	const drop: (e: DragEvent) => void = async (e) => {
		e.preventDefault();
		isDragover = false;

		const dataTransfer = e.dataTransfer;
		if (!dataTransfer) return;

		const files = dataTransfer.files;
		if (!files || files.length === 0) return;

		dropFile = files;
	};
</script>

<div class="flex h-full grow flex-col gap-4 p-4 text-white">
	<div
		role="region"
		ondrop={drop}
		ondragover={dragover}
		ondragleave={dragleave}
		class="flex h-full w-full grow flex-col items-center justify-center gap-4 rounded-lg border-2 decoration-amber-200 transition-all {isDragover
			? 'border-white bg-black'
			: 'border-dashed bg-black/70'}"
	>
		<span class="text-2xl">ここにファイルをドロップしてください </span>
		<span class="text-sm">.geojson .fgb .gpx .shp .dbf .shx .prj </span>
		<label class="bg-base grid cursor-pointer place-items-center rounded-full p-4 text-black">
			<span>またはファイルを選択</span>
			<input
				type="file"
				accept=".geojson,.fgb,.gpx,.shp,.dbf,.shx,.prj"
				class="hidden"
				onchange={(e) => inputFile(e)}
			/>
		</label>
	</div>
	<div class="flex grow items-center justify-center gap-4">
		<button
			onclick={() => showUploadDialog('raster')}
			class="grid aspect-video w-full max-w-[300px] cursor-pointer place-items-center rounded-lg bg-black p-4"
			>ラスタータイルの登録
		</button>
		<button
			onclick={() => showUploadDialog('vector')}
			class="grid aspect-video w-full max-w-[300px] cursor-pointer place-items-center rounded-lg bg-black p-4"
			>ベクタータイルの登録
		</button>
	</div>

	<!-- <button
		onclick={() => showUploadDialog('wmts')}
		class="bg-sub grid w-full max-w-[300px] cursor-pointer place-items-center rounded-full p-4"
		>wmstの登録
	</button> -->
</div>

<style>
</style>

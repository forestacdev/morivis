<script lang="ts">
	import type { GeoDataEntry } from '$routes/map/data/types';
	import {
		SUPPORTED_FILE_ACCEPT,
		SUPPORTED_FILE_GROUPS,
		type DialogType
	} from '$routes/map/types';

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
		const files = (e.target as HTMLInputElement).files;
		if (!files || files.length === 0) return;
		if (files.length === 1) {
			dropFile = files[0];
		} else {
			dropFile = files;
		}
	};

	const showUploadDialog = (type: DialogType) => {
		showDialogType = type;
	};

	const urlDialogs: { type: DialogType; label: string }[] = [
		{ type: 'raster', label: 'XYZタイル' },
		{ type: 'vector', label: 'ベクタータイル' },
		{ type: 'wmts', label: 'WMS/WMTS' },
		{ type: 'arcgis', label: 'ArcGIS' },
		{ type: 'pmtiles', label: 'PMTiles' },
		{ type: '3dtiles', label: '3D Tiles' },
		{ type: 'demxml', label: '基盤地図DEM' },
		{ type: 'stac', label: 'STAC API' }
	];
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
		class="flex h-full w-full grow flex-col items-center justify-center gap-16 rounded-lg border-2 decoration-amber-200 transition-all {isDragover
			? 'border-white bg-black'
			: 'border-dashed bg-black/70'}"
	>
		<div class="grid place-items-center gap-6">
			<span class="text-3xl">ここにファイルをドロップしてください </span>
			<div class="flex flex-wrap items-center justify-center gap-2 px-12">
				{#each SUPPORTED_FILE_GROUPS as group}
					<span class="bg-sub rounded-full p-1 px-3 text-xs">
						{group.label}{group.extensions.length > 1 ? ` (${group.extensions.join(' ')})` : ''}
					</span>
				{/each}
			</div>

			<label
				class="bg-base hover:bg-accent grid cursor-pointer place-items-center rounded-full p-4 text-black transition-colors hover:text-white"
			>
				<span>またはファイルを選択</span>
				<input
					type="file"
					multiple
					accept={SUPPORTED_FILE_ACCEPT}
					class="hidden"
					onchange={(e) => inputFile(e)}
				/>
			</label>
		</div>
		<div class="flex flex-wrap items-center justify-center gap-4 px-4">
			{#each urlDialogs as dialog}
				<button
					onclick={() => showUploadDialog(dialog.type)}
					class="bg-base hover:bg-accent grid cursor-pointer place-items-center rounded-full p-4 px-6 text-black transition-colors hover:text-white"
				>
					{dialog.label}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
</style>

<script lang="ts">
	import type { DialogType } from '$routes/+page.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { showDataMenu } from '$routes/store';

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
</script>

<div class="flex h-full flex-col gap-4 p-4 text-white">
	<button
		onclick={() => showUploadDialog('raster')}
		class="bg-sub grid w-full max-w-[300px] cursor-pointer place-items-center rounded-full p-4"
		>ラスタータイルの登録
	</button>
	<button
		onclick={() => showUploadDialog('vector')}
		class="bg-sub grid w-full max-w-[300px] cursor-pointer place-items-center rounded-full p-4"
		>ベクタータイルの登録
	</button>
	<label
		class="bg-sub flex w-full max-w-[300px] cursor-pointer flex-col items-center gap-2 rounded-full p-4"
	>
		<span>ファイルをアップロード</span><span class="text-sm"
			>.geojson .fgb .gpx .shp .dbf .shx .prj
		</span>
		<input
			type="file"
			accept=".geojson,.fgb,.gpx,.shp,.dbf,.shx,.prj"
			class="hidden"
			onchange={(e) => inputFile(e)}
		/>
	</label>
</div>

<style>
</style>

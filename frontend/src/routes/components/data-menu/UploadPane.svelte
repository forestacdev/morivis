<script lang="ts">
	import type { GeoDataEntry } from '$routes/data/types';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		dropFile: File | null;
	}

	let { showDataEntry = $bindable(), dropFile = $bindable() }: Props = $props();

	const inputFile = (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			dropFile = file;
		}
	};
</script>

<div class="h-full">
	<input
		type="file"
		accept=".geojson,.fgb,.gpx"
		class="c-btn-confirm mt-4 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-center text-gray-500 hover:bg-gray-50"
		onchange={(e) => inputFile(e)}
	/>
</div>

<style>
</style>

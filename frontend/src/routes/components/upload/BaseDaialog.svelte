<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	import type { DialogType } from '$routes/+page.svelte';
	import TextForm from '$routes/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';

	interface Props {
		showDialogType: DialogType;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
	}

	let {
		showDialogType = $bindable(),
		showDataEntry = $bindable(),
		tempLayerEntries = $bindable()
	}: Props = $props();

	let url = $state<string>('');
	let name = $state<string>('');

	const registration = () => {
		const entry = createRasterEntry(name, url);
		if (entry) {
			tempLayerEntries = [...tempLayerEntries, entry];
			showDataEntry = entry;
			showDialogType = null;
		}
	};
</script>

{#if showDialogType}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black/50"
	>
		<div
			transition:scale={{ duration: 300 }}
			class="bg-opacity-8 bg-main flex max-h-[600px] max-w-[600px] grow flex-col rounded-md p-4 text-base"
		>
			{#if showDialogType === 'raster'}
				<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
					<span class="text-2xl font-bold">ラスタータイルの登録</span>
				</div>
				<div
					class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-y-auto overflow-x-hidden"
				>
					<TextForm bind:value={name} label="データ名" />
					<TextForm bind:value={url} label="URL" />
				</div>
			{/if}
			<div class="flex shrink-0 justify-center overflow-auto pt-2">
				<button onclick={registration} class="c-btn-confirm px-12 py-6 text-lg"> 決定 </button>
			</div>
		</div>
	</div>
{/if}

<style>
</style>

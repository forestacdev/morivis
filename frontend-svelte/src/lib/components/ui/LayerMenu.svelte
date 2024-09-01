<script lang="ts">
	import Icon from '@iconify/svelte';

	import LayerSlot from '$lib/components/layerMenu/LayerSlot.svelte';
	import type { LayerEntry, CategoryEntry } from '$lib/utils/layers';
	import { isSide } from '$lib/store/store';

	import { flip } from 'svelte/animate';

	export let layerDataEntries: LayerEntry[] = [];

	// let layerData: LayerEntry[] = layerDataEntries[0].layers;

	let selectedLayerEntry: LayerEntry | null = null;
	let selectedCategoryName: string | null = null;

	const moveLayerById = (e: CustomEvent) => {
		const { id, direction } = e.detail;
		// idに対応するアイテムのインデックスを取得
		let index = layerDataEntries.findIndex((item) => item.id === id);

		// インデックスが見つからない場合はそのまま配列を返す
		if (index === -1) return layerDataEntries;

		// 上に移動する場合
		if (direction === 'up' && index > 0) {
			// 前のアイテムと入れ替え
			[layerDataEntries[index - 1], layerDataEntries[index]] = [
				layerDataEntries[index],
				layerDataEntries[index - 1]
			];
		}

		// 下に移動する場合
		if (direction === 'down' && index < layerDataEntries.length - 1) {
			// 次のアイテムと入れ替え
			[layerDataEntries[index + 1], layerDataEntries[index]] = [
				layerDataEntries[index],
				layerDataEntries[index + 1]
			];
		}
	};
</script>

<div
	class="bg-color-base absolute left-4 h-full overflow-visible rounded p-4 text-slate-100 shadow-2xl transition-all duration-200 {$isSide ===
	'raster'
		? ''
		: 'menu-out'}"
>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-y-2">
			{#each layerDataEntries as layerEntry (layerEntry.id)}
				<div animate:flip={{ duration: 200 }} class="overflow-visible">
					<LayerSlot bind:layerEntry on:moveLayerById={moveLayerById} />
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
</style>

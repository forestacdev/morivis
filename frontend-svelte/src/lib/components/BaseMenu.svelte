<script lang="ts">
	import type { CategoryEntry } from '$lib/utils/layers';
	import type { LayerEntry } from '$lib/utils/layers';

	export let backgroundIds: string[] = [];
	export let selectedBackgroundId: string = '';
	export let layerDataEntries: CategoryEntry[] = [];
	import { isSide } from '$lib/store/store';

	let selectedLayerEntry: LayerEntry | null = null;
	let selectedCategoryName: string | null = null;
</script>

<div
	class="absolute left-4 h-full overflow-visible rounded bg-gray-800 p-4 text-slate-100 shadow-2xl transition-all duration-200 {$isSide ===
	'base'
		? ''
		: 'menu-out'}"
>
	<div class="flex flex-col gap-5">
		<div>
			<label for="background" class="block text-sm font-semibold leading-6"
				>ベースマップ</label
			>
			<select
				bind:value={selectedBackgroundId}
				id="background"
				name="background"
				class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
			>
				{#each backgroundIds as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</select>
		</div>
	</div>
</div>

<style>
	:global(.tooltip.custom-tooltip) {
		--tooltip-background-color: rgb(255, 255, 255);
		--tooltip-color: rgb(0, 0, 0);
		--tooltip-box-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
	}
</style>

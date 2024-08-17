<script lang="ts">
	import type { CategoryEntry } from '$lib/utils/layers';
	import type { LayerEntry, BaseMapEntry } from '$lib/utils/layers';
	import { BASEMAP_IMAGE_TILE } from '$lib/constants';

	export let backgroundIds: string[] = [];
	export let selectedBackgroundId: string = '';
	export let backgroundSources: { [_: string]: BaseMapEntry } = {};
	export let layerDataEntries: CategoryEntry[] = [];
	import { isSide } from '$lib/store/store';

	let selectedLayerEntry: LayerEntry | null = null;
	let selectedCategoryName: string | null = null;
</script>

<div
	class="bg-color-base absolute left-4 flex h-full flex-col overflow-visible rounded p-4 text-slate-100 shadow-2xl transition-all duration-200 {$isSide ===
	'base'
		? ''
		: 'menu-out'}"
>
	<label for="background" class="block text-sm font-semibold leading-6">ベースマップ</label>

	<div class="custom-scroll flex h-full flex-col gap-4 overflow-auto p-2">
		{#each backgroundIds as name (name)}
			<label
				class="relative block h-[400px] cursor-pointer select-none items-center justify-start rounded-md bg-cover bg-center p-2 transition-all duration-200 {selectedBackgroundId ===
				name
					? 'custom-shadow py-[50px]'
					: 'custom-filter'}"
				style="background-image: url({backgroundSources[name].tiles[0]
					.replace('{z}', BASEMAP_IMAGE_TILE.Z.toString())
					.replace('{x}', BASEMAP_IMAGE_TILE.X.toString())
					.replace('{y}', BASEMAP_IMAGE_TILE.Y.toString())})"
			>
				<!-- <img
					src={}
					alt={name}
				/> -->
				<input
					type="radio"
					bind:group={selectedBackgroundId}
					value={name}
					class="invisible"
				/>
				<span
					class=" {selectedBackgroundId === name
						? 'custom-text-shadow-active'
						: 'custom-text-shadow'}">{name}</span
				>
			</label>
		{/each}
	</div>
</div>

<style>
	/* グロー効果 */
	.custom-shadow {
		--color: #0e8b00a3;
		box-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}

	.custom-filter {
		filter: brightness(0.8);
	}
	.custom-text-shadow {
		--color: #323232a3;
		text-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}

	.custom-text-shadow-active {
		--color: #00780ea3;
		text-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}
</style>

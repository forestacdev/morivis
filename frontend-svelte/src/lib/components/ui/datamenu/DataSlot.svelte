<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { LayerEntry } from '$lib/data/types';
	import { showlayerOptionId } from '$lib/store/store';

	import { addedLayerIds } from '$lib/store/store';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let layerEntry: LayerEntry;

	// レイヤーの追加、削除
	const toggleLayer = (id: string) => {
		addedLayerIds.addLayer(id);
	};
</script>

<div
	class="relative flex select-none flex-col justify-between gap-x-2 rounded-sm border-[1px] border-slate-50"
>
	<div class="relative flex justify-between">
		<label class="w-full cursor-pointer items-end p-2 transition-all duration-150">
			<span class="">{layerEntry.name}</span>
			<input class="invisible" type="checkbox" id={layerEntry.name} value={layerEntry} />
		</label>
		<button
			class="absolute right-1 top-2 flex w-12 cursor-pointer items-center justify-center"
			on:click={() => toggleLayer(layerEntry.id)}
		>
			<Icon
				class="transition-all duration-150"
				icon="weui:setting-outlined"
				width="24"
				height="24"
			/>
		</button>
	</div>
</div>

<style>
	/* :root {
		--active-width: 200px;
		--inactive-width: 150px;
	}
	.slot-active-anime {
		animation: slot-active 0.2s forwards;
		width: var(--inactive-width);
	}
	@keyframes slot-active {
		100% {
			width: var(--active-width);
		}
	}

	.slot-inactive-anime {
		width: var(--active-width);
		animation: slot-inactive 0.2s forwards;
	}

	@keyframes slot-inactive {
		100% {
			width: var(--inactive-width);
		}
	} */
</style>

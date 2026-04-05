<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { checkPc } from '$routes/map/utils/ui';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';

	interface Props {
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
		children: Snippet;
	}

	let {
		featureMenuData = $bindable(),
		layerEntries,
		showSelectionMarker = $bindable(),
		children
	}: Props = $props();

	$effect(() => {
		if (!featureMenuData) {
			showSelectionMarker = false;
		}
	});

	let targetLayer = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			return layer;
		}
		return null;
	});

	const edit = () => {
		if (targetLayer && targetLayer.type === 'vector') {
			selectedLayerId.set(targetLayer.id);
			isStyleEdit.set(true);
			featureMenuData = null; // Close the feature menu after editing
		}
	};
</script>

<!-- PC -->
{#if featureMenuData && checkPc()}
	<div
		transition:scale={{ duration: 300, start: 0.9, opacity: 0 }}
		class="bg-main w-side-menu max absolute top-0 left-0 z-20 flex h-full flex-col max-lg:hidden"
	>
		<div class="flex items-center gap-2 p-3 px-4 pt-4">
			{#if featureMenuData.layerId !== 'fac_poi'}
				<button
					onclick={edit}
					class="c-btn-confirm flex items-center justify-center gap-2 px-3 py-1 pr-4 max-lg:hidden"
				>
					<Icon icon="uil:setting" class="h-6 w-6" />
					<span class="text-sm select-none">スタイルの変更</span>
				</button>
			{/if}
			<button
				onclick={() => (featureMenuData = null)}
				class="bg-base ml-auto shrink-0 cursor-pointer rounded-full p-2"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>

		<div class="c-scroll-hidden relative flex h-full flex-col overflow-x-hidden">
			<!-- スクロールコンテンツ -->
			<div class="c-scroll-hidden h-full overflow-x-hidden overflow-y-auto px-2">
				{@render children()}
			</div>
			<div
				class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[150px] w-full"
			></div>
		</div>
	</div>
{/if}

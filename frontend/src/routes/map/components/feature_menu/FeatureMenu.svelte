<script lang="ts">
	import Icon from '@iconify/svelte';

	import { fade, fly } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';

	import { checkPc } from '$routes/map/utils/ui';

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
</script>

<!-- PC -->
{#if featureMenuData && checkPc()}
	<div
		transition:fly={{
			duration: 300,
			x: -100,
			opacity: 0
		}}
		class="bg-main w-side-menu max absolute top-0 left-0 z-20 flex h-full flex-col max-lg:hidden"
	>
		<div class="flex w-full justify-between p-3 px-4">
			<button
				onclick={() => (featureMenuData = null)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>

		<div class="c-scroll h-full overflow-x-hidden overflow-y-auto pl-2">
			{@render children()}
		</div>
	</div>
{/if}

<script lang="ts">
	import FeaturePanelMediaGallery from './FeaturePanelMediaGallery.svelte';

	import type { FeaturePanelSummary } from '$routes/map/types';

	interface Props {
		summary: FeaturePanelSummary;
	}

	let { summary }: Props = $props();
</script>

<div class="relative w-full max-lg:py-2 lg:p-2">
	<FeaturePanelMediaGallery media={summary.media ?? []} />

	<div class="flex w-full shrink-0 grow justify-between gap-1 pt-4 text-base max-lg:hidden">
		<div class="flex flex-col">
			<span class="text-[22px] font-bold break-all">{summary.title}</span>
			{#if summary.subtitle}
				<span class="text-[14px] break-all text-gray-300">{summary.subtitle}</span>
			{/if}
		</div>
	</div>
</div>

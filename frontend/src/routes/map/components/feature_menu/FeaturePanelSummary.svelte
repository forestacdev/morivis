<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import FeaturePanelMediaGallery from './FeaturePanelMediaGallery.svelte';

	import { ICONS } from '$lib/icons';
	import type { FeaturePanelSummary } from '$routes/map/types';

	interface Props {
		summary: FeaturePanelSummary;
	}

	let { summary }: Props = $props();
	let description = $derived(summary.description?.trim() ?? '');
</script>

<div in:fade={{ duration: 100 }}>
	<div class="relative w-full max-lg:py-2 lg:p-2">
		{#if summary.media && summary.media.length > 0}
			<FeaturePanelMediaGallery media={summary.media} />
		{/if}

		<div
			class="bottom-0 left-0 flex h-full w-full shrink-0 grow flex-col justify-end gap-1 pt-4 text-base max-lg:hidden"
		>
			<span class="text-[22px] font-bold break-all">{summary.title}</span>
			{#if summary.subtitle}
				<span class="text-[14px] break-all text-gray-300">{summary.subtitle}</span>
			{/if}
		</div>
	</div>

	<div class="lg:pl-2">
		<div class="flex h-full w-full flex-col gap-2 lg:pr-2">
			{#if summary.point}
				<div class="flex flex-col gap-2 rounded-lg bg-black p-2">
					<div class="flex w-full justify-start gap-2">
						<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
						<span class="text-accent">
							{summary.point[1].toFixed(6)}, {summary.point[0].toFixed(6)}
						</span>
					</div>
				</div>
			{/if}

			{#if summary.sourceUrl}
				<div class="flex w-full items-center justify-center">
					<a
						class="c-btn-confirm mt-4 flex items-center justify-start gap-2 rounded-full p-2 px-4 select-none"
						href={summary.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						><Icon icon={ICONS.open} class="h-6 w-6" />
						<span>{summary.sourceLabel ?? '詳細を見る'}</span></a
					>
				</div>
			{/if}

			{#if description}
				<span class="my-2 text-justify text-base whitespace-pre-line">{description}</span>
			{/if}
		</div>
	</div>
</div>

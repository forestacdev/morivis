<script lang="ts">
	import DOMPurify from 'dompurify';

	import TablerMapPinIcon from '$lib/components/svgs/icons/tabler/MapPinIcon.svelte';
	import UiOpenIcon from '$lib/components/svgs/icons/ui/OpenIcon.svelte';
	import type { BaseMetaData } from '$routes/map/data/types';

	interface Props {
		metaData: Pick<BaseMetaData, 'downloadUrl' | 'location' | 'sourceDataName' | 'description'>;
		descriptionSize?: 'sm' | 'base';
	}

	let { metaData, descriptionSize = 'sm' }: Props = $props();

	const formatDescription = (text: string): string => {
		const trimmedText = text.replace(/^\n+/, '');
		const urlRegex = /(https?:\/\/[^\s））\]」」＞>、。,]+)/g;
		const linked = trimmedText.replace(urlRegex, (url) => {
			return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
		});
		return DOMPurify.sanitize(linked.replace(/\n/g, '<br>'), {
			ALLOWED_TAGS: ['a', 'br'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		});
	};

	const descriptionHtml = $derived(
		metaData.description ? formatDescription(metaData.description) : ''
	);
</script>

{#if metaData.downloadUrl}
	<div class="flex flex-col items-center justify-center gap-2 pt-6">
		<a
			class="c-btn-confirm flex items-center justify-start gap-2 rounded-full p-2 px-4 select-none"
			href={metaData.downloadUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			<UiOpenIcon class="h-6 w-6" />
			<span>データ提供元サイト</span>
		</a>
	</div>
{/if}
<div class="mb-2 flex gap-2 pt-6 pl-2 text-base">
	<TablerMapPinIcon class="h-6 w-6" />
	<span>{metaData.location}</span>
</div>
{#if metaData.description || metaData.sourceDataName}
	<div class="rounded-lg p-2 text-justify {descriptionSize === 'base' ? 'text-base' : 'text-sm'}">
		{#if metaData.sourceDataName}
			元データ名:「{metaData.sourceDataName}」<br />
		{/if}
		{#if descriptionHtml}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html descriptionHtml}
		{/if}
	</div>
{/if}

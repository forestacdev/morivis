<script lang="ts">
	import Icon from '@iconify/svelte';
	import DOMPurify from 'dompurify';
	import { fade, fly } from 'svelte/transition';

	import type { GeoDataEntry } from '$routes/data/types';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			showDataEntry = null;
		}
	};

	const formatDescription = (text: string): string => {
		const urlRegex = /(https?:\/\/[^\s））\]」」＞>、。,]+)/g;
		const linked = text.replace(urlRegex, (url) => {
			return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
		});
		const withBreaks = linked.replace(/\n/g, '<br>');
		return DOMPurify.sanitize(withBreaks, {
			ALLOWED_TAGS: ['a', 'br'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		});
	};
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showDataEntry}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main w-side-menu absolute left-0 top-0 z-20 flex h-full flex-col gap-2 overflow-hidden px-2 pt-4"
	>
		<div class="flex w-full cursor-pointer justify-between pb-2">
			<button
				onclick={() => (showDataEntry = null)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>

		<div class="flex h-full flex-col gap-2 overflow-auto">
			<!-- タイトル -->
			<div class="flex shrink-0 grow flex-col gap-1 text-base">
				<div>{showDataEntry?.metaData.name}</div>
				<div>{showDataEntry?.metaData.location}</div>

				{#if showDataEntry}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div>{@html formatDescription(showDataEntry?.metaData.description)}</div>
				{/if}

				{#if showDataEntry?.metaData.downloadUrl}
					<a
						class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
						href={showDataEntry?.metaData.downloadUrl}
						target="_blank"
						rel="noopener noreferrer"
						><Icon icon="el:download" class="h-8 w-8" />
						<span>提供元からダウンロード</span></a
					>
				{/if}
			</div>
			<!-- 切り替えタブ -->

			<!-- 詳細情報 -->
			<div class="c-scroll flex h-full w-full grow flex-col overflow-y-auto">
				<!-- 属性情報 -->
			</div>
		</div>
	</div>
{/if}

<style>
</style>

<script lang="ts">
	import Icon from '@iconify/svelte';
	import DOMPurify from 'dompurify';
	import { fade, fly } from 'svelte/transition';

	import MapPane from '$routes/map/components/preview_menu/Map.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';

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
		<!-- <div class="absolute top-0 z-10 flex w-full justify-between p-4 px-6">
			<button
				onclick={() => (showDataEntry = null)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div> -->
		<div class="c-scroll flex h-full flex-col gap-2 overflow-y-auto overflow-x-hidden">
			<div class="flex shrink-0 grow flex-col gap-1 text-base">
				<!-- タイトル -->
				<div class="flex flex-col gap-1 py-2 pb-4">
					<div class="text-2xl">{showDataEntry?.metaData.name}</div>
					<div>{showDataEntry?.metaData.location}</div>
				</div>

				<div class="flex flex-col gap-1 py-2 pb-4">
					<div class="flex gap-1">
						<Icon icon="carbon:area" class="h-6 w-6" />
						<span class="font-bold">データ範囲</span>
					</div>

					{#if showDataEntry}
						<MapPane bind:showDataEntry />
					{/if}
				</div>

				{#if showDataEntry?.metaData.attribution !== 'カスタムデータ'}
					<div class="flex gap-1">
						<Icon icon="lets-icons:info-alt-fill" class="h-6 w-6" />
						<span class="font-bold">データ出典元</span>
					</div>
					<div class="mb-2 rounded-lg bg-black p-2">
						<span>{showDataEntry?.metaData.attribution}</span>
						{#if showDataEntry?.metaData.downloadUrl}
							<a
								class="text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150 hover:underline"
								href={showDataEntry?.metaData.downloadUrl}
								target="_blank"
								rel="noopener noreferrer"
								><Icon icon="el:download" class="h-6 w-6" />
								<span>データ提供元サイトを開く</span></a
							>
						{/if}
					</div>
				{/if}

				{#if showDataEntry.metaData.description}
					<div class="flex gap-1">
						<Icon icon="openmoji:overview" class="h-6 w-6" />
						<span class="font-bold">概要</span>
					</div>
					{#if showDataEntry}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<div class="rounded-lg bg-black p-2 text-sm">
							{@html formatDescription(showDataEntry?.metaData.description)}
						</div>
					{/if}
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

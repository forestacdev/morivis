<script lang="ts">
	import Icon from '@iconify/svelte';
	import DOMPurify from 'dompurify';
	import gsap from 'gsap';
	import { tick } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';

	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import { ICONS } from '$lib/icons';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import DataSlot from '$routes/map/components/data_menu/DataMenuSlot.svelte';
	import { getAttributionName } from '$routes/map/data/entries/_meta_data/_attribution';
	import { getPrefectureCode } from '$routes/map/data/pref';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { getLayerIcon, getLayerType } from '$routes/map/utils/entries';
	import { isBBoxInside } from '$routes/map/utils/map/bbox';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();
	let previewSpinToken = $state(0);
	let previewCardWrapper: HTMLDivElement | null = $state(null);

	const formatDescription = (text: string): string => {
		// 先頭の改行を除去
		const trimmedText = text.replace(/^\n+/, '');

		const urlRegex = /(https?:\/\/[^\s））\]」」＞>、。,]+)/g;
		const linked = trimmedText.replace(urlRegex, (url) => {
			return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
		});
		const withBreaks = linked.replace(/\n/g, '<br>');
		return DOMPurify.sanitize(withBreaks, {
			ALLOWED_TAGS: ['a', 'br'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		});
	};

	let prefCode = $derived.by(() => {
		if (showDataEntry) {
			return getPrefectureCode(showDataEntry.metaData.location);
		}
	});

	let layertype = $derived.by(() => {
		if (showDataEntry) {
			return getLayerType(showDataEntry);
		}
	});

	$effect(() => {
		if (showDataEntry) {
			const mapBbox = mapStore.getMapBounds();
			if (!isBBoxInside(mapBbox, showDataEntry.metaData.bounds)) {
				mapStore.focusLayer(showDataEntry);
			}
		}
	});

	const spinPreviewCard = () => {
		previewSpinToken += 1;
	};

	const animatePreviewCardEntrance = async () => {
		await tick();
		if (!previewCardWrapper) return;

		gsap.killTweensOf(previewCardWrapper);
		gsap.fromTo(
			previewCardWrapper,
			{
				yPercent: -120,
				y: -32,
				rotationX: 28,
				rotationZ: -65,
				scale: 0.38,
				opacity: 0
			},
			{
				yPercent: 0,
				y: 0,
				rotationX: 0,
				rotationZ: 0,
				scale: 1,
				opacity: 1,
				duration: 0.9,
				ease: 'power3.out'
			}
		);
	};

	let lastPreviewId = $state<string | null>(null);
	$effect(() => {
		const nextId = showDataEntry?.id ?? null;
		if (!nextId || nextId === lastPreviewId) return;
		lastPreviewId = nextId;
		spinPreviewCard();
		animatePreviewCardEntrance();
	});
</script>

{#if showDataEntry}
	<div
		transition:scale={{ duration: 300, start: 0.9, opacity: 0 }}
		class="bg-main lg:w-side-menu absolute top-0 left-0 z-20 flex h-full flex-col gap-2 overflow-hidden px-2 max-lg:hidden"
	>
		<div class="flex w-full justify-start gap-2 p-2 py-4">
			<Icon icon="akar-icons:eye" class="h-7 w-7 text-base" />
			<span class="text-base text-lg select-none max-lg:hidden">データプレビュー</span>
		</div>
		<div class="flex flex-col items-center justify-start pt-2 text-base">
			<!-- カード -->
			<div bind:this={previewCardWrapper} class="w-[300px]" style="perspective: 1200px;">
				<DataSlot
					dataEntry={showDataEntry}
					bind:showDataEntry
					itemHeight={180}
					index={0}
					isLeftEdge={false}
					isRightEdge={false}
					isTopEdge={false}
					spinToken={previewSpinToken}
				/>
			</div>
		</div>
		<div class="relative flex h-full flex-col overflow-hidden overflow-x-hidden">
			<!-- スクロールコンテンツ -->
			<div
				class="c-scroll-hidden pb-[100px h-full gap-2 overflow-x-hidden overflow-y-auto text-base"
			>
				{#if showDataEntry?.metaData.downloadUrl}
					<div class="flex flex-col items-center justify-center gap-2 pt-6">
						<a
							class="c-btn-confirm flex items-center justify-start gap-2 rounded-full p-2 px-4 select-none"
							href={showDataEntry?.metaData.downloadUrl}
							target="_blank"
							rel="noopener noreferrer"
							><Icon icon={ICONS.open} class="h-6 w-6" />
							<span>データ提供元サイト</span></a
						>
					</div>
				{/if}
				<div class="mb-2 flex gap-2 pt-6 pl-2">
					<Icon icon="tabler:map-pin" class="h-6 w-6" />
					<span class="">{showDataEntry?.metaData.location}</span>
				</div>
				{#if showDataEntry.metaData.description || showDataEntry.metaData.sourceDataName}
					{#if showDataEntry}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<div class="rounded-lg p-2 text-justify text-sm">
							{#if showDataEntry?.metaData.sourceDataName}
								元データ名:「{showDataEntry?.metaData.sourceDataName}」<br />
							{/if}

							{#if showDataEntry?.metaData.description}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html formatDescription(showDataEntry?.metaData.description)}
							{/if}
						</div>
					{/if}
				{/if}
			</div>
			<div
				class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[150px] w-full"
			></div>
		</div>
	</div>
{/if}

<style>
</style>

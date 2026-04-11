<script lang="ts">
	import Icon from '@iconify/svelte';
	import DOMPurify from 'dompurify';
	import { fade, fly, scale } from 'svelte/transition';

	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import { getAttributionName } from '$routes/map/data/entries/_meta_data/_attribution';
	import { getPrefectureCode } from '$routes/map/data/pref';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { getLayerIcon, getLayerType } from '$routes/map/utils/entries';
	import { isBBoxInside } from '$routes/map/utils/map';
	import { mapStore } from '$routes/stores/map';
	import DataSlot from '$routes/map/components/data_menu/DataMenuSlot.svelte';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();
	let previewSpinToken = $state(0);

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

	let lastPreviewId = $state<string | null>(null);
	$effect(() => {
		const nextId = showDataEntry?.id ?? null;
		if (!nextId || nextId === lastPreviewId) return;
		lastPreviewId = nextId;
		spinPreviewCard();
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
		<div class="flex h-full flex-col items-center justify-center text-base">
			<!-- ヘッダー -->
			<div class="w-[300px]">
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
	</div>
{/if}

<style>
</style>

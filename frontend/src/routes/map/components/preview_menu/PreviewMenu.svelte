<script lang="ts">
	import gsap from 'gsap';
	import { tick } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';

	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import AkarIconsEyeIcon from '$lib/components/svgs/icons/akar-icons/EyeIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import LayerInfo from '$routes/map/components/atoms/LayerInfo.svelte';
	import DataSlot from '$routes/map/components/data_menu/DataMenuSlot.svelte';
	import { getAttributionName } from '$routes/map/data/entries/_meta_data/_attribution';
	import { getPrefectureCode } from '$routes/map/data/pref';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import { getLayerIcon, getLayerType } from '$routes/map/utils/entries';
	import { isBBoxInside } from '$routes/map/utils/map/bbox';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();
	let previewSpinToken = $state(0);
	let previewCardWrapper: HTMLDivElement | null = $state(null);

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
			const shouldForceFocus = showDataEntry.type === 'model';
			if (shouldForceFocus || !isBBoxInside(mapBbox, showDataEntry.metaData.bounds)) {
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
			<AkarIconsEyeIcon class="h-7 w-7 text-base" />
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
				<LayerInfo metaData={showDataEntry.metaData} />
			</div>
			<div
				class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[150px] w-full"
			></div>
		</div>
	</div>
{/if}

<style>
</style>

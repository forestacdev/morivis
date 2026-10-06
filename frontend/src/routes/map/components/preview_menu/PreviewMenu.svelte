<script lang="ts">
	import gsap from 'gsap';
	import { tick } from 'svelte';
	import { scale } from 'svelte/transition';

	import AkarIconsEyeIcon from '$lib/components/svgs/icons/akar-icons/EyeIcon.svelte';
	import LayerInfo from '$routes/map/components/atoms/LayerInfo.svelte';
	import DataSlot from '$routes/map/components/data_menu/DataMenuSlot.svelte';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import { isBBoxInside } from '$routes/map/utils/map/bbox';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		previewEntries?: MorivisLayerEntry[];
	}

	let { showDataEntry = $bindable(), previewEntries }: Props = $props();
	const entries = $derived(previewEntries ?? (showDataEntry ? [showDataEntry] : []));
	const selectedIndex = $derived(entries.findIndex((entry) => entry.id === showDataEntry?.id));
	const fanOffset = (index: number) => {
		const middle = Math.floor(entries.length / 2);
		return (
			(((index - selectedIndex + entries.length + middle) % entries.length) - middle) /
			Math.max(1, middle)
		);
	};
	let lastFocusKey = '';
	let previewSpinToken = $state(0);
	let previewCardWrapper: HTMLDivElement | null = $state(null);

	let previewPanel = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const key = JSON.stringify(entries.map((entry) => [entry.id, entry.metaData.bounds]));
		if (!entries.length) {
			lastFocusKey = '';
			return;
		}
		if (!previewPanel || key === lastFocusKey) return;
		lastFocusKey = key;
		if (entries.length > 1) {
			const bounds: [number, number, number, number] = [
				Math.min(...entries.map((entry) => entry.metaData.bounds[0])),
				Math.min(...entries.map((entry) => entry.metaData.bounds[1])),
				Math.max(...entries.map((entry) => entry.metaData.bounds[2])),
				Math.max(...entries.map((entry) => entry.metaData.bounds[3]))
			];
			const panelWidth = previewPanel.getBoundingClientRect().width;
			mapStore.fitBounds(bounds, {
				padding: { top: 40, right: 40, bottom: panelWidth ? 180 : 280, left: panelWidth + 40 },
				duration: 800
			});
		} else {
			const entry = entries[0];
			if (entry.type === 'model' || !isBBoxInside(mapStore.getMapBounds(), entry.metaData.bounds)) {
				mapStore.focusLayer(entry);
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
		bind:this={previewPanel}
		transition:scale={{ duration: 300, start: 0.9, opacity: 0 }}
		class="bg-main lg:w-side-menu absolute top-0 left-0 z-20 flex h-full flex-col gap-2 overflow-hidden px-2 max-lg:hidden"
	>
		<div class="flex w-full justify-start gap-2 p-2 py-4">
			<AkarIconsEyeIcon class="h-7 w-7 text-base" />
			<span class="text-base text-lg select-none max-lg:hidden">データプレビュー</span>
		</div>
		{#if entries.length > 1}
			<div class="flex shrink-0 flex-col gap-2 px-2 pb-2" aria-label="プレビューするレイヤー">
				<p class="text-sm text-gray-300">{entries.length}レイヤーをまとめて表示中</p>
				<div class="preview-fan">
					{#each entries as entry, index (entry.id)}
						<div
							class="fan-card"
							style:--fan-angle="{fanOffset(index) * 12}deg"
							style:--fan-x="{fanOffset(index) * 22}px"
							style:z-index={entry.id === showDataEntry.id ? entries.length + 1 : index + 1}
						>
							<div class="fan-card-content">
								<DataSlot
									dataEntry={entry}
									bind:showDataEntry
									previewOnly
									itemHeight={180}
									{index}
									isLeftEdge={false}
									isRightEdge={false}
									isTopEdge={false}
								/>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
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
		{/if}
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
	.preview-fan {
		position: relative;
		height: 370px;
		width: 100%;
	}
	.fan-card {
		position: absolute;
		top: 24px;
		left: calc(50% - 115px);
		width: 230px;
		height: calc(230px * 4 / 3);
		transform-origin: center bottom;
		transform: translateX(var(--fan-x)) rotate(var(--fan-angle));
		transition: transform 260ms ease;
		filter: drop-shadow(0 8px 12px #0006);
	}
	.fan-card-content {
		width: 300px;
		transform: scale(calc(230 / 300));
		transform-origin: top left;
	}
	.fan-card:focus-within {
		z-index: 20 !important;
	}
	@media (prefers-reduced-motion: reduce) {
		.fan-card {
			transition: none;
		}
	}
</style>

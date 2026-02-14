<script lang="ts">
	import Icon from '@iconify/svelte';
	import { Bottomsheet } from '@devantic/diaper';
	import type { Snippet } from 'svelte';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { generatePopupTitle } from '$routes/map/utils/properties';
	import { isMobile } from '$routes/stores/ui';

	import { debugLog } from '$routes/stores/debug';

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

	let sheetRef = $state<ReturnType<typeof Bottomsheet> | null>(null);

	// featureMenuDataがあればシートを開く
	let sheetOpen = $state(false);

	$effect(() => {
		if (featureMenuData && $isMobile) {
			sheetOpen = true;
		} else {
			sheetOpen = false;
		}
	});

	// 閉じるときにfeatureMenuDataをクリアする
	const handleClose = () => {
		sheetOpen = false;
		featureMenuData = null;
	};

	// 現在のスナップ位置を追跡（0=全画面, 0.5=ハーフ, 1=閉じる）
	let currentSnap = $state(0.5);

	// スナップイベントのハンドラー
	const handleSnap = (progress: number) => {
		currentSnap = progress;
	};

	// ハンドルバーのトグル（全画面 ↔ ハーフ）
	const toggleExpand = () => {
		if (!sheetRef) return;
		if (currentSnap === 0) {
			sheetRef.snapTo(1); // ハーフへ
		} else {
			sheetRef.snapTo(0); // 全画面へ
		}
	};

	let propId = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties) {
			return featureMenuData.properties._prop_id;
		} else {
			return null;
		}
	});

	let targetLayer = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			return layer;
		}
		return null;
	});
</script>

{#if $isMobile}
	<Bottomsheet
		bind:this={sheetRef}
		bind:open={sheetOpen}
		snapPoints={[0, 0.5, 1]}
		initialIndex={1}
		nonmodal
		canDragSheet
		flat
		onclose={handleClose}
		onsnap={handleSnap}
		style="background-color: var(--color-main); border-radius: 20px 20px 0 0; padding-top: 5px; z-index: 10; overflow-x: hidden; --diaper-duration: 0.3s;"
	>
		{#snippet header()}
			<!-- ハンドルバー（タップで展開/折りたたみ） -->
			<button class="flex w-full cursor-pointer justify-center py-2" onclick={toggleExpand}>
				<div class="h-1.5 w-13 rounded-full bg-gray-400/50"></div>
			</button>
			<div class="flex w-full items-center justify-between px-4 pb-2">
				<div class="min-w-0 flex-1">
					{#if featureMenuData}
						{#if propId && featureMenuData.properties && featureMenuData.properties._prop_id}
							<span class="text-[22px] font-bold">{featureMenuData.properties.name}</span>
						{:else}
							<span class="text-[22px] font-bold"
								>{targetLayer &&
								targetLayer.type === 'vector' &&
								targetLayer.properties.attributeView.titles.length &&
								featureMenuData.properties
									? generatePopupTitle(
											featureMenuData.properties,
											targetLayer.properties.attributeView.titles
										)
									: targetLayer?.metaData.name}</span
							>
						{/if}
					{/if}
				</div>
				<button
					onclick={(e) => {
						e.stopPropagation();
						featureMenuData = null;
						sheetOpen = false;
					}}
					class="bg-base ml-2 shrink-0 cursor-pointer rounded-full p-2 shadow-md"
				>
					<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
				</button>
			</div>
		{/snippet}

		<div class="px-4 pb-4">
			{#if featureMenuData}
				{@render children()}
			{/if}
		</div>
	</Bottomsheet>
{/if}

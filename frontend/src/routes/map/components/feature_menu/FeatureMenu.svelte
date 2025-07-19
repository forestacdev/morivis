<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';

	import AttributeItem from '$routes/map/components/feature_menu/AttributeItem.svelte';
	import { propData } from '$routes/map/data/prop_data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { mapStore } from '$routes/stores/map';
	import type { FeatureMenuData } from '$routes/map/types';
	import { generatePopupTitle } from '$routes/map/utils/properties';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { isSideMenuType } from '$routes/stores/ui';

	let {
		featureMenuData = $bindable(),
		layerEntries
	}: { featureMenuData: FeatureMenuData | null; layerEntries: GeoDataEntry[] } = $props();

	let targetLayer = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			return layer;
		}
		return null;
	});

	let propId = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties) {
			return featureMenuData.properties._prop_id;
		} else {
			return null;
		}
	});

	let data = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties) {
			return propData[featureMenuData.properties._prop_id as string];
		} else {
			return null;
		}
	});

	let srcData = $derived.by(() => {
		if (data) {
			if (data.image) {
				return data.image;
			}
		}
		return null;
	});

	const edit = () => {
		if (targetLayer && targetLayer.type === 'vector') {
			$isSideMenuType = 'layer';

			selectedLayerId.set(targetLayer.id);
			isStyleEdit.set(true);
			featureMenuData = null; // Close the feature menu after editing
		}
	};

	// URLを省略する関数
	const truncateUrl = (url: string, maxLength = 50) => {
		if (url.length <= maxLength) return url;
		return url.substring(0, maxLength) + '...';
	};
</script>

{#if featureMenuData}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main w-side-menu absolute left-0 top-0 z-20 flex h-full flex-col gap-2"
	>
		<div class="absolute top-0 z-10 flex w-full justify-between p-4 px-6">
			<button
				onclick={() => (featureMenuData = null)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>

		<div class="c-scroll h-full overflow-y-auto overflow-x-hidden">
			<!-- 画像 -->
			<div class="relative w-full">
				{#if srcData}
					<img
						in:fade
						class="block aspect-square h-full w-full object-cover"
						alt="画像"
						src={srcData}
					/>
				{:else}
					<!-- !タイトルが長い場合 -->
					<div
						in:fade
						class="bg-sub aspect-2/1 grid h-full w-full shrink-0 grow place-items-center overflow-hidden"
					></div>
				{/if}
				<div
					class="c-gradient absolute bottom-0 left-0 flex h-full w-full shrink-0 grow flex-col justify-end gap-1 p-4 text-base"
				>
					{#if propId && featureMenuData.properties && featureMenuData.properties._prop_id}
						<!-- poiタイトル -->
						<span class="text-[22px] font-bold">{featureMenuData.properties.name}</span>
						<span class="text-[14px] text-gray-300">{featureMenuData.properties.category}</span>
					{:else}
						<!-- その他 -->
						<span class="text-[22px] font-bold"
							>{targetLayer &&
							targetLayer.type === 'vector' &&
							targetLayer.properties.titles.length &&
							featureMenuData.properties
								? generatePopupTitle(featureMenuData.properties, targetLayer.properties.titles)
								: targetLayer?.metaData.name}</span
						>
						<span class="text-[14px] text-gray-300"
							>{targetLayer && targetLayer.metaData.name ? targetLayer.metaData.name : ''}</span
						>
					{/if}
				</div>
			</div>

			<div class="pl-2">
				<!-- 詳細情報 -->
				<div class="flex h-full w-full flex-col gap-2 p-2">
					<div class="flex flex-col gap-2 rounded-lg bg-black p-2">
						<div class="flex w-full justify-start gap-2">
							<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
							<span class="text-accent"
								>{featureMenuData.point[0].toFixed(6)}, {featureMenuData.point[1].toFixed(6)}</span
							>
						</div>

						{#if data}
							{#if data.url}
								<a
									class="flex w-full items-start justify-start gap-2 break-all"
									href={data.url}
									target="_blank"
									rel="noopener noreferrer"
									><Icon icon="mdi:web" class="h-6 w-6 shrink-0 text-base" />
									<span class="text-accent text-ellipsis">{truncateUrl(data.url)}</span></a
								>
							{/if}
						{/if}
					</div>
					{#if data}
						{#if data.description}
							<span class="my-2 text-base">{data.description}</span>
						{/if}
					{/if}
				</div>

				<!-- 通常の地物の属性情報 -->
				{#if !propId}
					<div class="mb-56 flex h-full w-full flex-col gap-2">
						<div class="my-4 text-base text-lg">属性情報</div>
						{#if featureMenuData.properties}
							{#each Object.entries(featureMenuData.properties) as [key, value]}
								{#if key !== '_prop_id' && value}
									<AttributeItem {key} {value} />
								{/if}
							{/each}
						{/if}
					</div>
				{/if}

				{#if featureMenuData.layerId !== 'fac_poi'}
					<button
						onclick={edit}
						class="c-btn-confirm absolute bottom-2 right-2 z-10 flex items-center justify-center gap-2"
					>
						<Icon icon="ic:baseline-mode-edit-outline" class="h-6 w-6" />
						<span class="">レイヤーを編集</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.c-gradient {
		background: linear-gradient(
			0deg,
			var(--color-main) 0%,
			rgba(233, 233, 233, 0) 60%,
			rgba(233, 233, 233, 0) 100%
		);
	}
</style>

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';

	import AttributeItem from '$routes/map/components/feature_menu/AttributeItem.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';

	import { checkMobile, checkPc } from '$routes/map/utils/ui';

	interface Props {
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
	}

	let {
		featureMenuData = $bindable(),
		layerEntries,
		showSelectionMarker = $bindable()
	}: Props = $props();

	// URLを省略する関数
	const truncateUrl = (url: string, maxLength = 50) => {
		if (url.length <= maxLength) return url;
		return url.substring(0, maxLength) + '...';
	};
</script>

<!-- PC -->
{#if featureMenuData && checkPc()}
	<div
		transition:fly={{
			duration: 300,
			x: -100,
			opacity: 0
		}}
		class="bg-main w-side-menu max absolute left-0 top-0 z-20 flex h-full flex-col max-lg:hidden"
	>
		<div class="flex w-full justify-between p-3 px-4">
			<button
				onclick={() => (featureMenuData = null)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>

		<div class="c-scroll h-full overflow-y-auto overflow-x-hidden pl-2">
			<!-- 画像 -->
			<div class="b relative w-full p-2">
				<img
					in:fade
					class="block aspect-video h-full w-full rounded-lg object-cover"
					alt="画像"
					src={''}
				/>

				<div
					class="bottom-0 left-0 flex h-full w-full shrink-0 grow flex-col justify-end gap-1 pt-4 text-base"
				>
					<!-- poiタイトル -->
					<span class="text-[22px] font-bold">{''}</span>
					<span class="text-[14px] text-gray-300">{''}</span>
				</div>
			</div>

			<div class="pl-2">
				<!-- 詳細情報 -->
				<div class="flex h-full w-full flex-col gap-2 pr-2">
					<div class="flex flex-col gap-2 rounded-lg bg-black p-2">
						<!-- 座標 -->
						<div class="flex w-full justify-start gap-2">
							<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
							<span class="text-accent"
								>{featureMenuData.point[0].toFixed(6)}, {featureMenuData.point[1].toFixed(6)}</span
							>
						</div>

						<!-- url -->

						<a
							class="flex w-full items-start justify-start gap-2 break-all"
							href={''}
							target="_blank"
							rel="noopener noreferrer"
							><Icon icon="mdi:web" class="h-6 w-6 shrink-0 text-base" />
							<span class="text-accent text-ellipsis hover:underline">{truncateUrl('')}</span></a
						>
					</div>

					<!-- 概要説明 -->

					<span class="my-2 text-justify text-base">{''}</span>
				</div>

				<!-- 通常の地物の属性情報 -->

				<div class="my-4 flex items-center gap-1 text-base text-lg">
					<Icon icon="iconamoon:attention-circle-fill" class="h-5 w-5 shrink-0 text-base" /><span
						>データ内容</span
					>
				</div>
				<div class="mb-56 flex h-full w-full flex-col gap-3">
					{#if featureMenuData.properties}
						{#each Object.entries(featureMenuData.properties) as [key, value]}
							{#if key !== '_prop_id' && value}
								<AttributeItem {key} {value} />
							{/if}
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<script lang="ts">
	import { fly } from 'svelte/transition';

	import { geoDataEntries } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';

	import { isActiveMobileMenu, showDataMenu } from '$routes/stores/ui';

	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { showNotification } from '$routes/stores/notification';

	import { getLayerType } from '$routes/map/utils/entries';

	import { checkMobile, checkPc } from '$routes/map/utils/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		tempLayerEntries: GeoDataEntry[];
	}

	let { showDataEntry = $bindable(), tempLayerEntries = $bindable() }: Props = $props();

	const addData = () => {
		if (showDataEntry) {
			const copy = { ...showDataEntry };
			showDataEntry = null;
			if (!geoDataEntries.some((entry) => entry.id === copy.id)) {
				tempLayerEntries = [...tempLayerEntries, copy];
			}
			const layerType = getLayerType(copy);
			if (!layerType) {
				showNotification(`レイヤータイプが不明です: ${copy.id}`, 'error');
				return;
			}
			activeLayerIdsStore.addType(copy.id, layerType);
			activeLayerIdsStore.add(copy.id);
			showNotification(`${copy.metaData.name}を追加しました`, 'success');
			showDataMenu.set(false);
			if (checkMobile()) {
				$isActiveMobileMenu = 'map';
			}
		}
	};
	const deleteData = () => {
		if (showDataEntry) {
			activeLayerIdsStore.remove(showDataEntry.id);
			showDataEntry = null;
		}
	};
</script>

<div
	transition:fly={{ duration: 200, y: 100, opacity: 0 }}
	class="items-cente pointer-events-none absolute bottom-12 z-20 flex w-full justify-center"
>
	<div class="relative">
		<div
			class="c-ripple-effect absolute top-0 flex h-full w-full flex-col gap-4 rounded-lg border-2"
		></div>
		<div
			class="c-ripple-effect2 absolute top-0 flex h-full w-full flex-col gap-4 rounded-lg border-2"
		></div>
		<div class="border-1 absolute top-0 flex h-full w-full flex-col gap-4 rounded-lg"></div>

		<div class="border-sub border-1 flex flex-col gap-4 rounded-lg bg-black p-6">
			<span class="w-full text-center text-base">このデータを追加しますか？</span>
			<div class="flex gap-4">
				<button class="c-btn-sub pointer-events-auto px-4 text-lg" onclick={deleteData}
					>キャンセル
				</button>
				{#if showDataEntry}
					<button class="c-btn-confirm pointer-events-auto px-6 text-lg" onclick={addData}
						>地図に追加
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* エフェクト要素 */
	.c-ripple-effect {
		opacity: 0;
		animation: ripple 1.5s linear infinite;
	}

	.c-ripple-effect2 {
		opacity: 0;
		animation: ripple 1.5s 0.75s linear infinite;
	}

	/* アニメーションの定義 */
	@keyframes ripple {
		0% {
			scale: 1;
			opacity: 0.8;
		}

		100% {
			scale: 1.3;
			opacity: 0;
		}
	}
</style>

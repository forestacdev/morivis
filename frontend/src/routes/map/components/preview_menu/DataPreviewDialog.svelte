<script lang="ts">
	import { fly } from 'svelte/transition';

	import { geoDataEntries, registerInitialEntryStyle } from '$routes/map/data/entries';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import { getLayerType } from '$routes/map/utils/entries';
	import { resetWcsViewportReady } from '$routes/map/utils/formats/wcs/runtime';
	import { checkMobile } from '$routes/map/utils/platform/viewport';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { showNotification, showLayerAddedNotification } from '$routes/stores/notification';
	import { isActiveMobileMenu, showDataMenu } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		tempLayerEntries: MorivisLayerEntry[];
		previewEntries?: MorivisLayerEntry[];
	}

	let {
		showDataEntry = $bindable(),
		tempLayerEntries = $bindable(),
		previewEntries
	}: Props = $props();
	const entries = $derived(previewEntries ?? (showDataEntry ? [showDataEntry] : []));

	const isWcsEntry = (
		entry: MorivisLayerEntry
	): entry is Extract<MorivisLayerEntry, { type: 'raster'; format: { type: 'wcs' } }> =>
		entry.type === 'raster' && entry.format.type === 'wcs';

	const addData = () => {
		if (!showDataEntry || !entries.length) return;
		const copies = entries.map((entry) => ({ ...entry }));
		const types = copies.map(getLayerType);
		if (types.some((type) => !type)) {
			showNotification('レイヤータイプが不明です', 'error');
			return;
		}
		const localEntries = copies.filter(
			(entry) => !geoDataEntries.some((catalog) => catalog.id === entry.id)
		);
		localEntries.forEach(registerInitialEntryStyle);
		tempLayerEntries = [
			...tempLayerEntries.filter((entry) => !localEntries.some((added) => added.id === entry.id)),
			...localEntries
		];
		showDataEntry = null;
		copies.forEach((entry, index) => {
			activeLayerIdsStore.addType(entry.id, types[index]!);
			activeLayerIdsStore.add(entry.id);
			if (isWcsEntry(entry)) {
				resetWcsViewportReady(entry.id);
				mapStore.fitBounds(entry.metaData.bounds, { padding: 20, duration: 500 });
			}
		});
		if (copies.length === 1) showLayerAddedNotification(copies[0]);
		else showNotification(`${copies.length}レイヤーを追加しました`, 'success');
		showDataMenu.set(false);
		if (checkMobile()) $isActiveMobileMenu = 'map';
	};

	const deleteData = () => {
		for (const entry of entries) {
			activeLayerIdsStore.remove(entry.id);
			if (entry.type === 'raster' && entry.format.type === 'video') {
				URL.revokeObjectURL(entry.format.url);
			}
			if (entry.type === 'vector') {
				for (const detail of Object.values(entry.properties.detailsById ?? {})) {
					for (const media of detail.medias ?? []) {
						if (media.type === 'video' && media.url.startsWith('blob:')) {
							URL.revokeObjectURL(media.url);
						}
					}
				}
			}
		}
		showDataEntry = null;
	};
</script>

<div
	transition:fly={{ duration: 300, y: 100, opacity: 0 }}
	class="items-cente pointer-events-none absolute bottom-18 z-20 flex w-full justify-center"
>
	<div class="relative">
		<div
			class="c-ripple-effect absolute top-0 flex h-full w-full flex-col gap-4 rounded-lg border-2"
		></div>
		<div
			class="c-ripple-effect2 absolute top-0 flex h-full w-full flex-col gap-4 rounded-lg border-2"
		></div>
		<div class="absolute top-0 flex h-full w-full flex-col gap-4 rounded-lg border-1"></div>

		<div class="border-sub flex flex-col gap-4 rounded-lg border-1 bg-black p-6">
			<span class="w-full text-center text-base"
				>{entries.length > 1
					? `${entries.length}レイヤーをまとめて追加しますか？`
					: 'このデータを追加しますか？'}</span
			>
			{#if entries.length > 1}
				<ul
					class="text-base pointer-events-auto max-h-32 max-w-[75vw] space-y-1 overflow-auto text-sm lg:hidden"
					aria-label="追加するレイヤー"
				>
					{#each entries as entry (entry.id)}<li>{entry.metaData.name}</li>{/each}
				</ul>
			{/if}
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
			scale: 1.2;
			opacity: 0;
		}
	}
</style>

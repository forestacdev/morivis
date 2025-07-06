<script lang="ts">
	import { epsgPrefDict, epsgBboxDict, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { mapStore } from '$routes/stores/map';
	import { useEventTrigger } from '$routes/stores/ui';
	import { fade, fly, scale } from 'svelte/transition';

	interface Props {
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
	}

	let { showZoneForm = $bindable(), selectedEpsgCode = $bindable() }: Props = $props();

	const registration = () => {
		showZoneForm = false;
		useEventTrigger.trigger('setZone'); // 座標系を設定したイベントをトリガー

		// 選択されたEPSGコードを使用して何らかの処理を行う
	};

	$effect(() => {
		// 初期化や他の処理が必要な場合はここに記述

		const bbox = epsgBboxDict[selectedEpsgCode].bbox;
		const map = mapStore.getMap();

		if (map) {
			map.setFilter('zone', ['==', ['get', 'zone'], epsgBboxDict[selectedEpsgCode].zone]);
			map.fitBounds(bbox, {
				padding: { top: 20, bottom: 100, left: 20, right: 20 },
				maxZoom: 10 // ズームレベルの制限
			});
		}
	});
</script>

{#if showZoneForm}
	<div
		transition:fly={{ duration: 300, y: -20 }}
		class="pointer-events-none absolute bottom-4 z-30 flex w-full items-center justify-center"
	>
		<div
			class="bg-opacity-8 bg-main pointer-events-auto flex max-h-[600px] max-w-[600px] grow flex-col rounded-md p-4 text-base"
		>
			<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
				<span class="text-2xl font-bold">投影法の選択</span>
			</div>

			<div
				class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-y-auto overflow-x-hidden"
			>
				<div class="flex w-full max-w-[300px] flex-col items-center gap-2">
					<label for="epsg-select" class="text-lg">EPSGコードを選択してください</label>
					<select
						id="epsg-select"
						bind:value={selectedEpsgCode}
						class="w-full rounded-md border border-gray-300 p-2"
					>
						{#each Object.entries(epsgPrefDict) as [code, name]}
							<option value={code}>{name} ({code})</option>
						{/each}
					</select>
				</div>

				<div class="flex w-full max-w-[300px] flex-col items-center gap-2">
					<span class="text-lg">選択されたEPSGコード: {selectedEpsgCode}</span>
				</div>
			</div>
			<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
				<button
					onclick={() => (showZoneForm = false)}
					class="c-btn-cancel cursor-pointer p-4 text-lg"
				>
					キャンセル
				</button>
				<button onclick={registration} class="c-btn-confirm pointer min-w-[200px] p-4 text-lg">
					決定
				</button>
			</div>
		</div>
	</div>
{/if}

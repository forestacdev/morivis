<script lang="ts">
	import type { EpsgCode, EpsgInfoWithCode } from '$routes/map/utils/proj/dict';

	interface ZonePoiData {
		coordinates: [number, number];
		properties: EpsgInfoWithCode;
	}

	interface Props {
		selectedEpsgCode: EpsgCode;
		poiData: ZonePoiData[];
		canSwitchToGeoRef: boolean;
		onSwitchToGeoRef: () => void;
	}

	let { selectedEpsgCode, poiData, canSwitchToGeoRef, onSwitchToGeoRef }: Props = $props();
</script>

{#if canSwitchToGeoRef}
	<div class="mb-4 grid w-full shrink-0 grid-cols-2 gap-2">
		<button class="c-btn-confirm p-3 text-base">投影法</button>
		<button onclick={onSwitchToGeoRef} class="c-btn-sub cursor-pointer p-3 text-base">
			位置合わせ
		</button>
	</div>
{/if}

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">投影法の選択</span>
</div>

<div class="c-scroll-hidden relative flex h-full flex-col overflow-x-hidden">
	<div
		class="c-scroll-hidden flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto pb-[250px]"
	>
		{#each poiData as info (info.properties.code)}
			<label
				class="border-sub lg:hover:border-accent z-10 flex w-full cursor-pointer items-center justify-start rounded-md border p-3 transition-colors duration-200 {info
					.properties.code === selectedEpsgCode
					? 'bg-accent'
					: 'text-white'}"
			>
				<input
					type="radio"
					bind:group={selectedEpsgCode}
					value={info.properties.code}
					class="hidden"
				/>
				<div class="flex flex-col">
					<span class="transition-colors duration-200 select-none">{info.properties.name_ja}</span>
					<span class="text text-sm text-gray-300 transition-colors duration-200 select-none">
						{info.properties.prefecture ?? ''}
					</span>
				</div>
			</label>
		{/each}
	</div>
	<div class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[150px] w-full"></div>
</div>

<div class="flex w-full max-w-[300px] flex-col items-center gap-2 pt-2">
	<span class="text-lg">選択されたEPSGコード: {selectedEpsgCode}</span>
</div>

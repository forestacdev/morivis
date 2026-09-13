<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import type { SelectMenuItem } from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import type { Tiles3DMeshStyleEntry } from '$routes/map/data/types/model';
	import { fetchGeoidHeight } from '$routes/map/utils/tiles3d/geoid';
	import { isTerrain3d, mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: Tiles3DMeshStyleEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
	let loadingGeoid = $state(false);
	let geoidMessage = $state('');
	const getHeightOffset = () => layerEntry.style.heightOffset ?? layerEntry.metaData.altitude ?? 0;
	const setHeightOffset = (value: number | undefined) => {
		if (value !== undefined && Number.isFinite(value)) layerEntry.style.heightOffset = value;
	};
	const applyGeoidOffset = async () => {
		const entry = layerEntry;
		loadingGeoid = true;
		geoidMessage = '';
		try {
			const [west, south, east, north] = entry.metaData.bounds;
			const height = await fetchGeoidHeight((west + east) / 2, (south + north) / 2);
			if (entry !== layerEntry) return;
			entry.style.heightOffset = -Math.round(height * 100) / 100;
			geoidMessage = `中央地点のジオイド高 ${height.toFixed(2)} m を差し引きました。必要に応じて微調整してください。`;
		} catch (error) {
			if (entry === layerEntry)
				geoidMessage =
					error instanceof Error ? error.message : 'ジオイド高を取得できませんでした。';
		} finally {
			loadingGeoid = false;
		}
	};

	const lightingItems: SelectMenuItem[] = [
		{
			key: 'pbr',
			name: 'PBR'
		},
		{
			key: 'flat',
			name: 'フラット'
		}
	];

	$effect(() => {
		$state.snapshot(layerEntry.style);
		mapStore.setDeckTiles3DMeshStyle(layerEntry);
	});
</script>

<Accordion label="表示調整" icon="mdi:palette" bind:value={showColorOption}>
	<ColorPicker label="色" bind:value={layerEntry.style.color} />

	<div class="pb-2">
		<div class="pb-2 text-base select-none">ライティング</div>
		<BaseSelectMenu bind:selectedKey={layerEntry.style.lighting} items={lightingItems} />
	</div>

	<div class="flex flex-col gap-2 border-t border-current/10 pt-3 pb-2 text-base">
		<RangeSlider
			label="高さ補正 (m)"
			bind:value={getHeightOffset, setHeightOffset}
			min={Math.min(-100, getHeightOffset())}
			max={Math.max(100, getHeightOffset())}
			step={0.1}
			icon="mdi:arrow-up-down"
		/>

		{#if !$isTerrain3d}
			<button
				type="button"
				class="text-left text-sm underline"
				onclick={() => isTerrain3d.set(true)}
			>
				地形の3D表示をオンにする
			</button>
		{/if}
		<button
			type="button"
			class="rounded border border-current/20 px-3 py-2 text-sm disabled:opacity-50"
			disabled={loadingGeoid}
			onclick={applyGeoidOffset}
		>
			{loadingGeoid ? 'ジオイド高を取得中…' : 'ジオイド高から補正（概算）'}
		</button>
		<p class="text-xs opacity-70">
			楕円体高のモデルを標高の地形に合わせる場合に使います。中央地点の値で全体を補正します。 出典：<a
				href="https://tiles.gsj.jp/tiles/elev/tiles.html#gsigeoid"
				target="_blank"
				rel="noreferrer"
				class="underline">産総研・日本のジオイド2011</a
			>
		</p>
		{#if geoidMessage}<p role="status" class="text-xs">{geoidMessage}</p>{/if}
	</div>
</Accordion>

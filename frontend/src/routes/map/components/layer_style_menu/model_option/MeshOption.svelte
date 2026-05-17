<script lang="ts">
	import DimensionSelector from '../raster_option/DimensionSelector.svelte';
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorMapSelect from '$routes/map/components/atoms/select/ColorMapSelect.svelte';
	import { DEFAULT_MESH_SHADING } from '$routes/map/data/types/model';
	import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';
	import { COLOR_MAP_TYPE } from '$routes/map/data/types/raster';
	import { ColorMapManager } from '$routes/map/utils/style/color-mapping';

	interface Props {
		layerEntry: ModelMeshEntry<MeshStyle>;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
	let temporalDimension = $derived(layerEntry.properties?.temporal?.dimension);
	let showDimensionOption = $state(false);
	const colorMapManager = new ColorMapManager();
	const canEditScale = $derived(layerEntry.style.transformOptions?.scale ?? true);
	const canEditRotation = $derived(layerEntry.style.transformOptions?.rotation ?? true);
	const canEditHeightScale = $derived(layerEntry.style.transformOptions?.heightScale ?? true);
	const canEditHeightOffset = $derived(layerEntry.style.transformOptions?.heightOffset ?? true);

	const ensureShading = () => {
		layerEntry.style.shading ??= { ...DEFAULT_MESH_SHADING };
	};

	ensureShading();

	$effect(() => {
		ensureShading();
		if (temporalDimension && !layerEntry.state?.dimension) {
			layerEntry.state = {
				...layerEntry.state,
				dimension: {
					currentIndex: 0
				}
			};
		}
	});
</script>

{#if temporalDimension}
	<div class="mt-4">
		<DimensionSelector bind:layerEntry bind:showDimensionOption />
	</div>
{/if}

<div class="mt-4">
	<Switch label="ワイヤーフレーム表示" bind:value={layerEntry.style.wireframe} />
</div>

<div class="mt-4">
	<Switch label="陰影" bind:value={layerEntry.style.shading!.enabled} />
</div>

{#if layerEntry.style.heightColorRamp}
	<div class="mt-4">
		<Switch label="高さカラーランプ" bind:value={layerEntry.style.heightColorRamp.enabled} />
	</div>

	{#if layerEntry.style.heightColorRamp.enabled}
		<div class="mt-4 flex w-full flex-col gap-4">
			<ColorMapSelect
				bind:isColorMap={layerEntry.style.heightColorRamp.colorMap}
				mutableColorMapType={[...COLOR_MAP_TYPE]}
			>
				{#snippet children(_isColorMap)}
					<ColorScaleDem isColorMap={_isColorMap} />
				{/snippet}
			</ColorMapSelect>

			<RangeSliderDouble
				label="高さ範囲"
				bind:lowerValue={layerEntry.style.heightColorRamp.min}
				bind:upperValue={layerEntry.style.heightColorRamp.max}
				min={layerEntry.style.heightColorRamp.sourceMin ??
					Math.min(layerEntry.style.heightColorRamp.min, layerEntry.style.heightColorRamp.max)}
				max={layerEntry.style.heightColorRamp.sourceMax ??
					Math.max(layerEntry.style.heightColorRamp.min, layerEntry.style.heightColorRamp.max)}
				step={0.01}
				primaryColor={colorMapManager.createSimpleCSSGradient(
					layerEntry.style.heightColorRamp.colorMap
				)}
				minRangeColor={colorMapManager.getMinColor(layerEntry.style.heightColorRamp.colorMap)}
				maxRangeColor={colorMapManager.getMaxColor(layerEntry.style.heightColorRamp.colorMap)}
			/>
		</div>
	{/if}
{/if}

{#if layerEntry.style.shading!.enabled}
	<div class="mt-4 flex w-full flex-col gap-4">
		<RangeSlider
			label="陰影強度"
			bind:value={layerEntry.style.shading!.shadeStrength}
			min={0}
			max={1.5}
			step={0.05}
			icon="mdi:weather-sunny-alert"
		/>

		<RangeSlider
			label="環境光"
			bind:value={layerEntry.style.shading!.ambientStrength}
			min={0}
			max={1}
			step={0.05}
			icon="mdi:lightbulb-on-outline"
		/>

		<RangeSlider
			label="光源の方位角 (°)"
			bind:value={layerEntry.style.shading!.azimuthDeg}
			min={0}
			max={360}
			step={1}
			isInt
			icon="mdi:compass-outline"
		/>

		<RangeSlider
			label="光源の仰角 (°)"
			bind:value={layerEntry.style.shading!.elevationDeg}
			min={0}
			max={90}
			step={1}
			isInt
			icon="mdi:weather-sunset-up"
		/>
	</div>
{/if}

<div class="mt-4 flex w-full flex-col gap-4">
	{#if canEditScale}
		<RangeSlider
			label="スケール"
			bind:value={layerEntry.style.transform.scale}
			min={0.01}
			max={100}
			step={0.01}
			icon="mdi:resize"
		/>
	{/if}

	{#if canEditHeightScale && layerEntry.style.transform.heightScale != null}
		<RangeSlider
			label="高さ倍率"
			bind:value={layerEntry.style.transform.heightScale}
			min={0.01}
			max={100}
			step={0.01}
			icon="mdi:image-filter-hdr"
		/>
	{/if}

	{#if canEditHeightOffset && layerEntry.style.transform.heightOffset != null}
		<RangeSlider
			label="高さオフセット (m)"
			bind:value={layerEntry.style.transform.heightOffset}
			min={-100}
			max={1000}
			step={1}
			isInt
			icon="mdi:arrow-up-down"
		/>
	{/if}

	{#if canEditRotation}
		<RangeSlider
			label="X回転 (°)"
			bind:value={layerEntry.style.transform.rotationX}
			min={0}
			max={360}
			step={1}
			isInt
			icon="mdi:rotate-right"
		/>

		<RangeSlider
			label="Y回転 (°)"
			bind:value={layerEntry.style.transform.rotationY}
			min={0}
			max={360}
			step={1}
			isInt
			icon="mdi:rotate-right"
		/>

		<RangeSlider
			label="Z回転 (°)"
			bind:value={layerEntry.style.transform.rotationZ}
			min={0}
			max={360}
			step={1}
			isInt
			icon="mdi:rotate-right"
		/>
	{/if}
</div>

<style>
</style>

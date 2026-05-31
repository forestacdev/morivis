<script lang="ts">
	import { slide } from 'svelte/transition';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import ColorMapSelect from '$routes/map/components/atoms/select/ColorMapSelect.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorScaleDem from '$routes/map/components/layer_style_menu/extension_menu/ColorScaleDem.svelte';
	import DimensionSelector from '$routes/map/components/layer_style_menu/raster_option/DimensionSelector.svelte';
	import { DEFAULT_MESH_SHADING } from '$routes/map/data/types/model';
	import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';
	// import { SEQUENTIAL_SCHEMES } from '$routes/map/utils/color/color-brewer';
	import { MATLAB_COLOR_MAP_NAMES } from '$routes/map/utils/color/matlab-colormaps';
	import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
	import { mapStore } from '$routes/stores/map';
	interface Props {
		layerEntry: ModelMeshEntry<MeshStyle>;
		showColorOption: boolean;
		showDimensionOption: boolean;
	}

	let {
		layerEntry = $bindable(),
		showColorOption = $bindable(),
		showDimensionOption = $bindable()
	}: Props = $props();
	let temporalDimension = $derived(layerEntry.properties?.temporal?.dimension);
	let animationClips = $derived(layerEntry.properties?.animation?.clips ?? []);
	let showMaterialOption = $state(false);
	let showAnimationOption = $state(false);
	let showTransformOption = $state(false);
	let showRotateOption = $state(false);

	const colorMapManager = new ColorMapManager();
	const colorMapOptions = [...MATLAB_COLOR_MAP_NAMES];
	const canEditShading = $derived(layerEntry.style.shadingOptions?.enabled ?? true);
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
		if (!canEditShading && layerEntry.style.shading) {
			layerEntry.style.shading.enabled = false;
		}
		if (animationClips.length > 0 && !layerEntry.state?.animation) {
			layerEntry.state = {
				...layerEntry.state,
				animation: {
					currentClipIndex: 0,
					playing: false,
					speed: 1
				}
			};
		}
		if (temporalDimension && !layerEntry.state?.dimension) {
			layerEntry.state = {
				...layerEntry.state,
				dimension: {
					currentIndex: 0
				}
			};
		}
	});

	$effect(() => {
		if (animationClips.length === 0 || !layerEntry.state?.animation) return;
		const animationStateKey = [
			layerEntry.state.animation.currentClipIndex,
			layerEntry.state.animation.playing,
			layerEntry.state.animation.speed
		].join(':');
		if (!animationStateKey) return;
		mapStore.setModelAnimationState(layerEntry);
	});
</script>

{#if animationClips.length > 0}
	<Accordion label="アニメーション" icon="mdi:run-fast" bind:value={showAnimationOption}>
		{#if animationClips.length > 0 && layerEntry.state?.animation}
			<div class="">
				<Switch label="アニメーション再生" bind:value={layerEntry.state.animation.playing} />
			</div>

			{#if layerEntry.state.animation.playing}
				<div class="mt-4 flex w-full flex-col gap-3" transition:slide>
					<BaseSelectMenu
						bind:selectedKey={layerEntry.state.animation.currentClipIndex}
						items={animationClips.map((clip, index) => ({
							key: index,
							name: clip.name
						}))}
					/>

					<RangeSlider
						label="再生速度"
						bind:value={layerEntry.state.animation.speed}
						min={0.1}
						max={3}
						step={0.1}
					/>
				</div>
			{/if}
		{/if}
	</Accordion>
{/if}

<DimensionSelector bind:layerEntry bind:showDimensionOption />

<Accordion label="マテリアル" icon="mdi:format-color-highlight" bind:value={showMaterialOption}>
	<Switch label="ワイヤーフレーム表示" bind:value={layerEntry.style.wireframe} />

	{#if layerEntry.style.heightColorRamp}
		<Switch label="高さカラーランプ" bind:value={layerEntry.style.heightColorRamp.enabled} />

		{#if layerEntry.style.heightColorRamp.enabled}
			<div transition:slide class="mb-4 flex w-full flex-col gap-2">
				<ColorMapSelect
					bind:isColorMap={layerEntry.style.heightColorRamp.colorMap}
					mutableColorMapType={colorMapOptions}
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
	{#if canEditShading}
		<Switch label="陰影" bind:value={layerEntry.style.shading!.enabled} />
	{/if}
	{#if canEditShading && layerEntry.style.shading!.enabled}
		<div transition:slide class="mb-4 flex w-full flex-col gap-2">
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
</Accordion>

<Accordion label="変形・移動" icon="gis:cube-3d" bind:value={showTransformOption}>
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
</Accordion>

{#if canEditRotation}
	<Accordion label="回転" icon="lucide:rotate-3d" bind:value={showRotateOption}>
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
	</Accordion>
{/if}

<style>
</style>

<script lang="ts">
	import { slide } from 'svelte/transition';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import ColorMapSelect from '$routes/map/components/atoms/select/ColorMapSelect.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorScaleDem from '$routes/map/components/layer_style_menu/extension_menu/ColorScaleDem.svelte';
	import ColorOption from '$routes/map/components/layer_style_menu/ColorOption.svelte';
	import DimensionSelector from '$routes/map/components/layer_style_menu/raster_option/DimensionSelector.svelte';
	import { createAdjustableRange } from '$routes/map/data/types';
	import { DEFAULT_MESH_SHADING } from '$routes/map/data/types/model';
	import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
	// import { SEQUENTIAL_SCHEMES } from '$routes/map/utils/color/color-brewer';
	import { COLORMAP_PRESET_NAMES } from '$routes/map/utils/color/colormap-presets';
	import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
	import { getInitialModelAnimationState } from '$routes/map/utils/three/model-animation';
	import { showModelView } from '$routes/stores/ui';
	import { isTerrain3d, mapStore } from '$routes/stores/map';
	interface Props {
		layerEntry: MeshEntry<MeshStyle>;
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
	let isPmx = $derived(layerEntry.format.type === 'pmx');
	let isVrm = $derived(layerEntry.format.type === 'vrm');
	let canAddExternalMotion = $derived(isPmx || isVrm);
	let canConfigureAnimation = $derived(canAddExternalMotion || animationClips.length > 0);
	let showMaterialOption = $state(false);
	let showAnimationOption = $state(false);
	let showTransformOption = $state(false);
	let showRotateOption = $state(false);
	let showPartColorOption = $state(false);
	let mmdMotionInput = $state<HTMLInputElement>();
	let vrmaMotionInput = $state<HTMLInputElement>();

	const colorMapManager = new ColorMapManager();
	const colorMapOptions = [...COLORMAP_PRESET_NAMES];
	const canEditScale = $derived(layerEntry.style.transformOptions?.scale ?? true);
	const canEditRotation = $derived(layerEntry.style.transformOptions?.rotation ?? true);
	const canEditHeightScale = $derived(layerEntry.style.transformOptions?.heightScale ?? true);
	const canEditHeightOffset = $derived(layerEntry.style.transformOptions?.heightOffset ?? true);
	const isIfc = $derived(layerEntry.format.type === 'ifc');
	const hasPartColorProfile = $derived(
		layerEntry.properties?.ifc?.extractionProfiles.some((profile) => profile.type === 'part-colors')
	);
	let isLoadingPartAttributes = $state(false);
	let partColorAttributeCount = $state<number | null>(null);
	const ensureShading = () => {
		layerEntry.style.showThroughTerrain ??= false;
		layerEntry.style.shading ??= { ...DEFAULT_MESH_SHADING };
		if (layerEntry.style.heightColorRamp) {
			layerEntry.style.heightColorRamp.range ??= createAdjustableRange(
				layerEntry.style.heightColorRamp.min ?? 0,
				layerEntry.style.heightColorRamp.max ?? 0,
				layerEntry.style.heightColorRamp.sourceMin ?? layerEntry.style.heightColorRamp.min ?? 0,
				layerEntry.style.heightColorRamp.sourceMax ?? layerEntry.style.heightColorRamp.max ?? 0
			);
		}
	};

	const openMmdMotionPicker = () => {
		mmdMotionInput?.click();
	};

	const addMmdMotionFiles = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []).filter((file) => /\.vmd$/i.test(file.name));
		input.value = '';
		if (files.length === 0) return;
		appendExternalMotionFiles(files, 'vmd');
	};

	const openVrmaMotionPicker = () => {
		vrmaMotionInput?.click();
	};

	const addVrmaMotionFiles = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []).filter((file) => /\.vrma$/i.test(file.name));
		input.value = '';
		if (files.length === 0) return;
		appendExternalMotionFiles(files, 'vrma');
	};

	const appendExternalMotionFiles = (files: File[], type: 'vmd' | 'vrma') => {
		const animation = layerEntry.properties?.animation;
		const currentClipIndex = animation?.clips.length ?? 0;
		const clips = files.map((file) =>
			type === 'vmd'
				? {
						name: file.name.replace(/\.vmd$/i, ''),
						type: 'vmd' as const,
						url: URL.createObjectURL(file)
					}
				: {
						name: file.name.replace(/\.vrma$/i, ''),
						type: 'vrma' as const,
						url: URL.createObjectURL(file)
					}
		);

		layerEntry.properties = {
			...layerEntry.properties,
			animation: {
				...animation,
				clips: [...(animation?.clips ?? []), ...clips]
			}
		};
		layerEntry.state = {
			...layerEntry.state,
			animation: {
				currentClipIndex,
				playing: true,
				speed: layerEntry.state?.animation?.speed ?? animation?.defaultSpeed ?? 1,
				loop: layerEntry.state?.animation?.loop ?? animation?.defaultLoop ?? true
			}
		};
	};

	ensureShading();

	$effect(() => {
		ensureShading();
		if (animationClips.length > 0 && !layerEntry.state?.animation) {
			const animationState = getInitialModelAnimationState(layerEntry.properties?.animation);
			if (!animationState) return;
			layerEntry.state = {
				...layerEntry.state,
				animation: animationState
			};
		}
		if (layerEntry.state?.animation) {
			layerEntry.state.animation.loop ??= layerEntry.properties?.animation?.defaultLoop ?? true;
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
		if (!isIfc || !hasPartColorProfile) return;
		let isCurrent = true;
		isLoadingPartAttributes = true;
		void mapStore
			.loadIfcPartColorAttributes(layerEntry)
			.then((attributeCount) => {
				if (!isCurrent) return;
				partColorAttributeCount = attributeCount;
			})
			.catch((error) => {
				if (!isCurrent) return;
				console.error('IFC色分け属性の事前読込に失敗しました', error);
				partColorAttributeCount = 0;
			})
			.finally(() => {
				if (isCurrent) isLoadingPartAttributes = false;
			});
		return () => {
			isCurrent = false;
		};
	});

	$effect(() => {
		if (animationClips.length === 0 || !layerEntry.state?.animation) return;
		const animationStateKey = [
			layerEntry.state.animation.currentClipIndex,
			layerEntry.state.animation.playing,
			layerEntry.state.animation.speed,
			layerEntry.state.animation.loop
		].join(':');
		if (!animationStateKey) return;
		mapStore.setModelAnimationState(layerEntry);
	});
</script>

{#if canConfigureAnimation}
	<Accordion label="アニメーション" icon="mdi:run-fast" bind:value={showAnimationOption}>
		{#if isPmx}
			<input
				bind:this={mmdMotionInput}
				type="file"
				accept=".vmd"
				multiple
				onchange={addMmdMotionFiles}
				class="hidden"
			/>
			<button type="button" onclick={openMmdMotionPicker} class="c-btn-sub w-full">
				VMDモーションを追加
			</button>
		{:else if isVrm}
			<input
				bind:this={vrmaMotionInput}
				type="file"
				accept=".vrma"
				multiple
				onchange={addVrmaMotionFiles}
				class="hidden"
			/>
			<button type="button" onclick={openVrmaMotionPicker} class="c-btn-sub w-full">
				VRMAモーションを追加
			</button>
		{/if}

		{#if animationClips.length > 0 && layerEntry.state?.animation}
			<div class:mt-3={canAddExternalMotion}>
				<Switch label="アニメーション再生" bind:value={layerEntry.state.animation.playing} />
				<div class="mt-2">
					<Switch label="ループ再生" bind:value={layerEntry.state.animation.loop} />
				</div>
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
		{:else if isPmx}
			<p class="mt-3 text-sm text-base/70">VMDモーションを追加すると再生できます。</p>
		{:else if isVrm}
			<p class="mt-3 text-sm text-base/70">VRMAモーションを追加すると再生できます。</p>
		{/if}
	</Accordion>
{/if}

<DimensionSelector bind:layerEntry bind:showDimensionOption />

	{#if isIfc}
		{#if isLoadingPartAttributes && partColorAttributeCount === null}
			<div class="mb-2 text-sm text-base/70">IFC色分け属性を解析中です</div>
		{:else if layerEntry.style.partColors && (partColorAttributeCount ?? 0) > 0}
			<ColorOption
				bind:colorStyle={layerEntry.style.partColors}
				bind:showColorOption={showPartColorOption}
				showExpressionWhenDisabled
			/>
		{:else}
			<div class="mb-2 text-sm text-base/70">色分けに使える事前定義属性がありません</div>
		{/if}
	{/if}

<Accordion label="マテリアル" icon="mdi:format-color-highlight" bind:value={showMaterialOption}>
	{#if $isTerrain3d}
		<div transition:slide>
			<Switch label="地中を表示" bind:value={layerEntry.style.showThroughTerrain} />
		</div>
	{/if}
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
					bind:lowerValue={layerEntry.style.heightColorRamp.range!.value[0]}
					bind:upperValue={layerEntry.style.heightColorRamp.range!.value[1]}
					min={layerEntry.style.heightColorRamp.range!.domain[0]}
					max={layerEntry.style.heightColorRamp.range!.domain[1]}
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
	<Switch label="陰影" bind:value={layerEntry.style.shading!.enabled} />
	{#if layerEntry.style.shading!.enabled}
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

{#if !$showModelView}
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
{/if}

<style>
</style>

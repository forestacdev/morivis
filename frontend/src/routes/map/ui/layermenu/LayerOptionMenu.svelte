<script lang="ts">
	import type { LayerEntry } from '$routes/map/data/types';
	import { demLayers } from '$routes/map/data/raster/dem';
	import Icon from '@iconify/svelte';
	export let layerDataEntries: LayerEntry[];
	import { showlayerOptionId, isSide, addedLayerIds } from '$lib/store/store';
	import { mapStore } from '$lib/store/map';
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { split } from 'postcss/lib/list';
	import ColorRamp from './ColorRamp.svelte';
	import { COLOR_MAP_TYPE } from '$routes/map/data/raster/dem';
	import type { ColorMapTypeKey } from '$routes/map/data/raster/dem';

	isSide.subscribe((value) => {
		if (value !== 'layer') {
			showlayerOptionId.set('');
		}
	});

	let layerOption: LayerEntry | undefined;
	$: layerOption = layerDataEntries.find((layer) => layer.id === $showlayerOptionId);

	// レイヤーの削除
	const removeLayer = () => {
		if (!layerOption) return;
		addedLayerIds.removeLayer(layerOption.id);
		showlayerOptionId.set('');
	};

	// レイヤーの移動
	const moveLayerById = (direction: 'up' | 'down') => {
		if (!layerOption) return;
		const id = layerOption.id;

		addedLayerIds.reorderLayer(id, direction);
	};

	// レイヤーのフォーカス
	const focusLayer = () => {
		if (!layerOption) return;

		mapStore.focusLayer(layerOption.id);
	};

	const setColor = (e: any) => {
		console.log(e);
	};

	const reloadDemTile = () => {
		mapStore.reloadDemTile();
	};
</script>

<div
	class="absolute left-[370px] flex h-full w-[200px] flex-col gap-2 rounded-sm bg-[#C27142] p-2 text-slate-100 shadow-2xl transition-all duration-200 {$showlayerOptionId
		? ''
		: 'pointer-events-none -translate-x-[100px] opacity-0'}"
>
	{#if $showlayerOptionId && layerOption}
		<div>
			<button class="" on:click={() => moveLayerById('up')}
				><Icon icon="bx:up-arrow" width="24" height="24" class="" />
			</button>
			<button class="" on:click={() => moveLayerById('down')}
				><Icon icon="bx:down-arrow" width="24" height="24" />
			</button>
			<button on:click={removeLayer}>
				<Icon icon="bx:trash" width="24" height="24" class="custom-anime" />
			</button>
			<button on:click={focusLayer}>
				<Icon icon="hugeicons:target-03" width="24" height="24" class="custom-anime" />
			</button>
		</div>
		<div class="h-full">
			<div class="flex gap-2">
				<label class="block">表示</label>
				<input type="checkbox" class="custom-checkbox" bind:checked={layerOption.visible} />
			</div>
			<div class="flex flex-col gap-2">
				<label class="block">透過度</label>
				<input
					type="range"
					class="custom-slider"
					bind:value={layerOption.opacity}
					min="0"
					max="1"
					step="0.01"
				/>
			</div>
			{#if layerOption.dataType === 'vector' || layerOption.dataType === 'geojson'}
				{#if layerOption.showLabel !== undefined}
					<div class="flex gap-2">
						<label class="block">ラベル</label>
						<input
							type="checkbox"
							class="custom-checkbox"
							bind:checked={layerOption.showLabel}
						/>
					</div>
				{/if}
				{#if layerOption.showLine !== undefined}
					<div class="flex gap-2">
						<label class="block">アウトライン</label>
						<input
							type="checkbox"
							class="custom-checkbox"
							bind:checked={layerOption.showLine}
						/>
					</div>
				{/if}
				{#if layerOption.showFill !== undefined}
					<div class="flex gap-2">
						<label class="block">塗りつぶし</label>
						<input
							type="checkbox"
							class="custom-checkbox"
							bind:checked={layerOption.showFill}
						/>
					</div>
				{/if}
				{#if layerOption.geometryType === 'polygon'}
					<div class="flex flex-col gap-2">
						<select
							class="custom-select {!layerOption.showFill ? 'opacity-50' : ''}"
							bind:value={layerOption.styleKey}
							disabled={!layerOption.showFill}
						>
							{#each layerOption.style.fill as item (item)}
								<option value={item.name}>{item.name}</option>
							{/each}
						</select>
					</div>
					{#if layerOption.styleKey === '単色'}
						<div class="flex gap-2">
							<label class="block">色</label>
							<input
								type="color"
								class="custom-color"
								bind:value={layerOption.style.fill[0].paint['fill-color']}
							/>
						</div>
					{/if}
				{:else if layerOption.geometryType === 'line'}
					<div class="flex flex-col gap-2">
						<select class="custom-select" bind:value={layerOption.styleKey}>
							{#each layerOption.style.line as item (item)}
								<option value={item.name}>{item.name}</option>
							{/each}
						</select>
					</div>
					{#if layerOption.styleKey === '単色'}
						<div class="flex gap-2">
							<label class="block">色</label>
							<input
								type="color"
								class="custom-color"
								bind:value={layerOption.style.line[0].paint['line-color']}
							/>
						</div>
					{/if}
				{:else if layerOption.geometryType === 'point'}
					<div class="flex flex-col gap-2">
						<select class="custom-select" bind:value={layerOption.styleKey}>
							{#each layerOption.style.circle as item (item)}
								<option value={item.name}>{item.name}</option>
							{/each}
						</select>
					</div>
					{#if layerOption.styleKey === '単色'}
						<div class="flex gap-2">
							<label class="block">色</label>
							<input
								type="color"
								class="custom-color"
								bind:value={layerOption.style.circle[0].paint['circle-color']}
							/>
						</div>
					{/if}
				{/if}
			{/if}

			{#if layerOption.dataType === 'raster'}
				<!-- TODO: -->
			{/if}
			{#if layerOption.geometryType === 'dem'}
				<select class="custom-select" bind:value={layerOption.tileId}>
					{#each demLayers as item}
						<option value={item.id}>{item.name}</option>
					{/each}
				</select>
				<div class="flex h-full flex-col gap-2 overflow-y-auto">
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<label class="block cursor-pointer" for="evolution">標高図</label>
							<input
								id="evolution"
								type="checkbox"
								class="custom-checkbox"
								bind:checked={layerOption.uniformsData.evolution.visible}
								on:change={reloadDemTile}
							/>
						</div>
						{#if layerOption.uniformsData.evolution.visible}
							<div class="flex flex-col gap-2">
								<label class="block">透過度</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.evolution.opacity}
									min="0"
									max="1"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
							<label class="block">カラーランプ</label>
							<select
								class="custom-select"
								bind:value={layerOption.uniformsData.evolution.colorMap}
								on:change={reloadDemTile}
							>
								{#each Object.entries(COLOR_MAP_TYPE) as [name, value]}
									<option value={name}>
										{name}
									</option>
								{/each}
							</select>
							<ColorRamp colorMap={layerOption.uniformsData.evolution.colorMap} />

							<div class="flex flex-col gap-2">
								<label class="block">最大値</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.evolution.max}
									min="0"
									max="4000"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
							<div class="flex flex-col gap-2">
								<label class="block">最小値</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.evolution.min}
									min="-500"
									max="4000"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
						{/if}
					</div>
					<div class="flex gap-2">
						<div class="flex items-center gap-2">
							<label class="block" for="slope">傾斜量</label>
							<input
								id="slope"
								type="checkbox"
								class="custom-checkbox"
								bind:checked={layerOption.uniformsData.slope.visible}
								on:change={reloadDemTile}
							/>
						</div>
					</div>
					{#if layerOption.uniformsData.slope.visible}
						<div class="flex flex-col gap-2">
							<label class="block">透過度</label>
							<input
								type="range"
								class="custom-slider"
								bind:value={layerOption.uniformsData.slope.opacity}
								min="0"
								max="1"
								step="0.01"
								on:change={reloadDemTile}
							/>
						</div>
						<label class="block">カラーランプ</label>
						<select
							class="custom-select"
							bind:value={layerOption.uniformsData.slope.colorMap}
							on:change={reloadDemTile}
						>
							{#each Object.entries(COLOR_MAP_TYPE) as [name, value]}
								<option value={name}>
									{name}
								</option>
							{/each}
						</select>

						<ColorRamp colorMap={layerOption.uniformsData.slope.colorMap} />
					{/if}
					<div class="flex gap-2">
						<div class="flex items-center gap-2">
							<label class="block" for="aspect">傾斜方向</label>
							<input
								id="aspect"
								type="checkbox"
								class="custom-checkbox"
								bind:checked={layerOption.uniformsData.aspect.visible}
								on:change={reloadDemTile}
							/>
						</div>
					</div>
					{#if layerOption.uniformsData.aspect.visible}
						<div class="flex flex-col gap-2">
							<label class="block">透過度</label>
							<input
								type="range"
								class="custom-slider"
								bind:value={layerOption.uniformsData.aspect.opacity}
								min="0"
								max="1"
								step="0.01"
								on:change={reloadDemTile}
							/>
						</div>
						<label class="block">カラーランプ</label>
						<select
							class="custom-select"
							bind:value={layerOption.uniformsData.aspect.colorMap}
							on:change={reloadDemTile}
						>
							{#each Object.entries(COLOR_MAP_TYPE) as [name, value]}
								<option value={name}>
									{name}
								</option>
							{/each}
						</select>

						<ColorRamp colorMap={layerOption.uniformsData.aspect.colorMap} />
					{/if}
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<label class="block" for="shadow">陰影</label>
							<input
								id="shadow"
								type="checkbox"
								class="custom-checkbox"
								bind:checked={layerOption.uniformsData.shadow.visible}
								on:change={reloadDemTile}
							/>
						</div>
						{#if layerOption.uniformsData.shadow.visible}
							<div class="flex flex-col gap-2">
								<label class="block">透過度</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.shadow.opacity}
									min="0"
									max="1"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
							<div class="flex gap-2">
								<label class="block">方位角</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.shadow.azimuth}
									min="0"
									max="360"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
							<div class="flex gap-2">
								<label class="block">高度角</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.shadow.altitude}
									min="0"
									max="90"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
						{/if}
					</div>
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<label class="block" for="curvature">曲率</label>
							<input
								id="curvature"
								type="checkbox"
								class="custom-checkbox"
								bind:checked={layerOption.uniformsData.curvature.visible}
								on:change={reloadDemTile}
							/>
						</div>
						{#if layerOption.uniformsData.curvature.visible}
							<div class="flex flex-col gap-2">
								<label class="block">透過度</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.curvature.opacity}
									min="0"
									max="1"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
							<div class="flex gap-2">
								<label class="block">尾根の強調率</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.curvature.ridgeThreshold}
									min="0"
									max="1"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
							<div class="flex gap-2">
								<label class="block">尾根の色</label>
								<input
									type="color"
									class="custom-color"
									bind:value={layerOption.uniformsData.curvature.ridgeColor}
									on:change={reloadDemTile}
								/>
							</div>
							<div class="flex gap-2">
								<label class="block">谷の強調率</label>
								<input
									type="range"
									class="custom-slider"
									bind:value={layerOption.uniformsData.curvature.valleyThreshold}
									min="0"
									max="1"
									step="0.01"
									on:change={reloadDemTile}
								/>
							</div>
							<div class="flex gap-2">
								<label class="block">谷の色</label>
								<input
									type="color"
									class="custom-color"
									bind:value={layerOption.uniformsData.curvature.valleyColor}
									on:change={reloadDemTile}
								/>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
		<div class="custom-scroll h-full overflow-y-auto">
			{#if layerOption.geometryType === 'polygon'}
				{#if layerOption.style?.fill?.find((item) => item.name === layerOption.styleKey).paint['fill-color'][0] === 'match'}
					{#each layerOption.style?.fill
						?.find((item) => item.name === layerOption.styleKey)
						.paint['fill-color'].slice(2, -1) as item, index (index)}
						<div class="flex w-full items-center">
							{#if index % 2 === 0}
								<div class="w-full text-sm">{item}</div>
							{:else}
								<div
									class="h-[10px] w-full"
									style="background-color: {item};"
								></div>
							{/if}
						</div>
					{/each}
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
</style>

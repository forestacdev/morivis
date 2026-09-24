<script lang="ts">
	import {
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LAT
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import type { McaRegionPosition } from '$routes/map/utils/formats/mca/types';
	import { validateMcaWorldPlacement } from '$routes/map/utils/formats/mca/world-placement';
	import {
		isValidModelPlacementLatitude,
		isValidModelPlacementLongitude
	} from '$routes/map/utils/three/model-placement-coordinates';

	interface Props {
		lng: number | undefined;
		lat: number | undefined;
		metersPerBlock: number | undefined;
		region: McaRegionPosition;
		regions?: McaRegionPosition[];
		placementValid: boolean;
		gridVisible: boolean;
		gridLabels: boolean;
		onUseMapCenter: () => void;
		onShowTerrain: () => void;
	}
	let {
		lng = $bindable(),
		lat = $bindable(),
		metersPerBlock = $bindable(),
		region,
		regions,
		placementValid,
		gridVisible = $bindable(),
		gridLabels = $bindable(),
		onUseMapCenter,
		onShowTerrain
	}: Props = $props();
	const displayedRegions = $derived(regions?.length ? regions : [region]);
	const inputId = $props.id();
	const lngInvalid = $derived(!isValidModelPlacementLongitude(lng));
	const latInvalid = $derived(!isValidModelPlacementLatitude(lat));
	const metersInvalid = $derived(
		metersPerBlock === undefined || !Number.isFinite(metersPerBlock) || metersPerBlock <= 0
	);
	const errorMessage = $derived(
		validateMcaWorldPlacement({
			lng: lng ?? Number.NaN,
			lat: lat ?? Number.NaN,
			metersPerBlock: metersPerBlock ?? Number.NaN
		})
	);
</script>

<div
	class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-x-hidden overflow-y-auto px-2 text-sm"
>
	<p>ワールド原点（X=0、Z=0）を指定してください。</p>
	<p>{displayedRegions.length}リージョン</p>
	<label class="flex flex-col gap-1">
		<span>ワールド原点の経度</span>
		<input
			class="c-input w-full"
			type="number"
			step="any"
			min="-180"
			max="180"
			required
			bind:value={lng}
			aria-invalid={lngInvalid}
			aria-describedby={lngInvalid ? `${inputId}-error` : undefined}
		/>
	</label>
	<label class="flex flex-col gap-1">
		<span>ワールド原点の緯度</span>
		<input
			class="c-input w-full"
			type="number"
			step="any"
			min={WEB_MERCATOR_MIN_LAT}
			max={WEB_MERCATOR_MAX_LAT}
			required
			bind:value={lat}
			aria-invalid={latInvalid}
			aria-describedby={latInvalid ? `${inputId}-error` : undefined}
		/>
	</label>
	<button type="button" class="c-btn-sub px-3 py-2" onclick={onUseMapCenter}
		>地図中心を原点にする</button
	>
	<label class="flex items-center gap-2">
		<span class="shrink-0">1ブロック =</span>
		<input
			class="c-input min-w-0 flex-1"
			type="number"
			step="any"
			min="0"
			required
			aria-label="1ブロックの長さ（m）"
			bind:value={metersPerBlock}
			aria-invalid={metersInvalid}
			aria-describedby={!placementValid ? `${inputId}-error` : undefined}
		/>
		<span>m</span>
	</label>
	{#if !placementValid}
		<p id={`${inputId}-error`} class="text-red-400" aria-live="polite">
			{errorMessage ?? '1ブロックの長さを描画可能な正の数値で指定してください。'}
		</p>
		<p>グリッドは直前の有効な配置を表示中です。</p>
	{/if}
	<div class="flex flex-col gap-2">
		<label class="flex items-center gap-2"
			><input type="checkbox" bind:checked={gridVisible} /><span>リージョングリッド</span></label
		>
		<label class="flex items-center gap-2"
			><input type="checkbox" bind:checked={gridLabels} disabled={!gridVisible} /><span
				>リージョン名ラベル</span
			></label
		>
		<p>グリッドは確定後に非表示になります。</p>
	</div>
	<p>赤いボックスをドラッグして移動できます。</p>
	<button
		type="button"
		class="c-btn-sub px-3 py-2"
		disabled={!placementValid}
		onclick={onShowTerrain}>地形を表示</button
	>
</div>

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
	<h2 class="text-xl font-bold">Minecraftのジオリファレンス</h2>
	<p>ワールド原点（X=0、Z=0）の地図上の位置を指定します。Xの正方向は東、Zの正方向は南です。</p>
	<div class="rounded-md bg-black/15 p-3">
		<p class="font-bold">{displayedRegions.length}リージョンを一括配置</p>
		<ul class="max-h-40 overflow-y-auto">
			{#each displayedRegions as item (`${item.x},${item.z}`)}
				<li class="mb-2">
					<p class="break-all">r.{item.x}.{item.z}.mca</p>
					<p>
						ワールド範囲: X {item.x * 512}〜{item.x * 512 + 511}、Z {item.z * 512}〜{item.z * 512 +
							511}
					</p>
				</li>
			{/each}
		</ul>
		<p>
			1リージョンは512×512ブロックです。リージョン間の位置関係を保ち、選択したチャンクを元の位置に配置します。
		</p>
	</div>
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
		<p>グリッドは最後に有効だった配置を表示しています。</p>
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
		<p>読み込んだ各リージョンと周囲の3×3区画を表示します。重なる区画はまとめて表示します。</p>
		<p>グリッドは位置合わせ完了時に消えます。再表示するにはレイヤー設定で有効にしてください。</p>
	</div>
	<p>
		赤いボックスをドラッグするとワールド原点が移動します。大きさは上の入力欄で変更し、東西南北の向きを保ちます。
	</p>
	<button
		type="button"
		class="c-btn-sub px-3 py-2"
		disabled={!placementValid}
		onclick={onShowTerrain}>地形を表示</button
	>
	<p>「決定」で原点とブロックの長さを保存し、次の.mcaにも引き継ぎます。</p>
</div>

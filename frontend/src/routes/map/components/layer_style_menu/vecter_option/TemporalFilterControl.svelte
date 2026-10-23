<script lang="ts">
	import { onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import type {
		MorivisVectorEntry,
		GeoJsonMetaData,
		TileMetaData,
		VectorTemporalFilterState
	} from '$routes/map/data/types/vector';
	import {
		getVectorTemporalFilterBehavior,
		getVectorTemporalItems,
		type VectorTemporalCameraTrackingMode,
		type VectorTemporalItem
	} from '$routes/map/data/types/vector/properties';
	import { createTemporalCameraTracker } from '$routes/map/utils/runtime/temporal-camera';
	import { applyTemporalFilter } from '$routes/map/utils/runtime/temporal-filter';

	interface Props {
		layerEntry: MorivisVectorEntry<GeoJsonMetaData | TileMetaData>;
		showDimensionOption: boolean;
	}

	interface TemporalCameraTrackingState {
		enabled: boolean;
	}

	type TemporalCameraTrackingUiMode = 'feature' | 'route' | 'route_auto_bearing';

	const defaultCameraTrackingDurationMs = 220;

	// 時間フィルターの初期状態。
	// 実際の選択範囲は、時間候補数が分かった後に補正する。
	const createDefaultTemporalFilterState = (): VectorTemporalFilterState => ({
		enabled: false,
		startIndex: 0,
		endIndex: 0,
		mode: 'range'
	});

	const createDefaultTemporalCameraTrackingState = (): TemporalCameraTrackingState => ({
		enabled: false
	});

	let { layerEntry = $bindable(), showDimensionOption = $bindable() }: Props = $props();

	let temporalFilterState = $state<VectorTemporalFilterState>(createDefaultTemporalFilterState());
	let cameraTrackingState = $state<TemporalCameraTrackingState>(
		createDefaultTemporalCameraTrackingState()
	);
	let cameraTrackingModeOverride = $state<TemporalCameraTrackingUiMode | null>(null);
	let cameraTrackingDurationMs = $state(defaultCameraTrackingDurationMs);
	let isPlaying = $state(false);
	let loopPlayback = $state(false);
	let playbackSpeed = $state(1201);
	let singleStartFilterMode = $state(false);
	let restoredLayerId = $state<string | null>(null);
	let lastTrackedTarget = $state<string | null>(null);
	let playbackFrameId: number | null = null;
	let playbackLastTimestamp: number | null = null;

	// 時間軸の定義は properties.temporal を正とし、
	// 既存データのために attributeView.timeKey も後方互換で見る。
	const temporalConfig = $derived(
		(layerEntry.properties.temporal ??
			(layerEntry.properties.attributeView.timeKey
				? { key: layerEntry.properties.attributeView.timeKey }
				: undefined)) as typeof layerEntry.properties.temporal | undefined
	);

	const filterBehavior = $derived(
		temporalConfig ? getVectorTemporalFilterBehavior(temporalConfig) : undefined
	);

	// 複数の時間キー候補がある場合でも、比較用の参照順をここで一本化する。
	const temporalKeys = $derived.by(() => {
		const keys = [filterBehavior?.key, ...(filterBehavior?.alternateKeys ?? [])].filter(
			(key): key is string => Boolean(key)
		);
		return Array.from(new Set(keys));
	});

	// スライダーの目盛りは、読み込み時に作った時刻一覧をそのまま使う。
	const temporalItems = $derived.by(() => {
		return getVectorTemporalItems(layerEntry.properties.temporal) as VectorTemporalItem[];
	});
	const isSingleStartFilterMode = $derived(singleStartFilterMode);
	const activeTemporalIndex = $derived(
		isSingleStartFilterMode ? temporalFilterState.startIndex : temporalFilterState.endIndex
	);

	const canTrackCamera = $derived(layerEntry.format.type === 'geojson');
	const defaultCameraTrackingMode = $derived<VectorTemporalCameraTrackingMode>(
		layerEntry.properties.temporal?.cameraTrackingMode ?? 'feature'
	);
	const defaultCameraTrackingUiMode = $derived<TemporalCameraTrackingUiMode>(
		defaultCameraTrackingMode === 'route' ? 'route' : 'feature'
	);
	const activeCameraTrackingMode = $derived<TemporalCameraTrackingUiMode>(
		cameraTrackingModeOverride ?? defaultCameraTrackingUiMode
	);
	const activeCameraTrackingBaseMode = $derived<VectorTemporalCameraTrackingMode>(
		activeCameraTrackingMode === 'feature' ? 'feature' : 'route'
	);
	const shouldAutoBearing = $derived(activeCameraTrackingMode === 'route_auto_bearing');
	const isRouteTrackingMode = $derived(activeCameraTrackingBaseMode === 'route');
	const playbackIntervalMs = $derived(2001 - playbackSpeed);
	const cameraTracker = createTemporalCameraTracker({
		getEntry: () => layerEntry,
		getItems: () => temporalItems,
		getKeys: () => temporalKeys,
		getIndex: () => activeTemporalIndex,
		getAutoBearing: () => shouldAutoBearing,
		getDuration: () => cameraTrackingDurationMs
	});
	const touchDependencies = (...values: unknown[]) => values;

	// レイヤー切り替え時に、entry.state に保存してある時間フィルター状態を復元する。
	const restoreTemporalFilterState = () => {
		if (restoredLayerId === layerEntry.id) return;

		const savedState = layerEntry.state?.temporalFilter;
		if (savedState && temporalItems.length > 0) {
			temporalFilterState = {
				enabled: savedState.enabled,
				startIndex: Math.min(savedState.startIndex, temporalItems.length - 1),
				endIndex: Math.min(savedState.endIndex, temporalItems.length - 1),
				mode: savedState.mode ?? 'range'
			};
		} else {
			temporalFilterState = {
				...createDefaultTemporalFilterState(),
				endIndex: Math.max(temporalItems.length - 1, 0)
			};
		}
		singleStartFilterMode = temporalFilterState.mode === 'single_start';
		cameraTrackingState = createDefaultTemporalCameraTrackingState();
		cameraTrackingModeOverride = null;
		cameraTrackingDurationMs = defaultCameraTrackingDurationMs;

		restoredLayerId = layerEntry.id;
	};

	// 開始側が終了側を追い越したら、終了側を押し出す。
	const handleStartInput = () => {
		if (isSingleStartFilterMode) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
			return;
		}
		if (temporalFilterState.startIndex > temporalFilterState.endIndex) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}
	};

	// 終了側が開始側を追い越したら、開始側を押し出す。
	const handleEndInput = () => {
		if (temporalFilterState.endIndex < temporalFilterState.startIndex) {
			temporalFilterState.startIndex = temporalFilterState.endIndex;
		}
	};

	const handleRangeInput = () => {
		handleStartInput();
		handleEndInput();
	};

	const stopPlayback = () => {
		if (playbackFrameId !== null) {
			cancelAnimationFrame(playbackFrameId);
			playbackFrameId = null;
		}
		playbackLastTimestamp = null;
		isPlaying = false;
		cameraTracker.reset();
		cameraTracker.resetTerrain();
	};

	const startPlayback = () => {
		if (temporalItems.length === 0) return;
		stopPlayback();

		if (!temporalFilterState.enabled) {
			temporalFilterState.enabled = true;
		}

		if (isSingleStartFilterMode) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}

		if (temporalFilterState.endIndex >= temporalItems.length - 1) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}

		const stepPlayback = (timestamp: number) => {
			if (playbackLastTimestamp === null) {
				playbackLastTimestamp = timestamp;
			}

			let hasAdvancedFrame = false;
			while (timestamp - playbackLastTimestamp >= playbackIntervalMs) {
				playbackLastTimestamp += playbackIntervalMs;
				if (temporalFilterState.endIndex >= temporalItems.length - 1) {
					if (loopPlayback) {
						temporalFilterState.endIndex = temporalFilterState.startIndex;
						if (isSingleStartFilterMode) {
							temporalFilterState.startIndex = temporalFilterState.endIndex;
						}
						cameraTracker.reset();
						continue;
					}
					stopPlayback();
					return;
				}
				temporalFilterState.endIndex += 1;
				hasAdvancedFrame = true;
				if (isSingleStartFilterMode) {
					temporalFilterState.startIndex = temporalFilterState.endIndex;
				}
			}

			if (cameraTrackingState.enabled) {
				if (isRouteTrackingMode) {
					if (hasAdvancedFrame) {
						cameraTracker.trackRoute(temporalFilterState.endIndex, 0);
					}
				} else if (hasAdvancedFrame) {
					cameraTracker.trackCurrentFeature();
				}
			}

			if (temporalFilterState.endIndex >= temporalItems.length - 1) {
				if (loopPlayback) {
					playbackFrameId = requestAnimationFrame(stepPlayback);
					return;
				}
				stopPlayback();
				return;
			}
			playbackFrameId = requestAnimationFrame(stepPlayback);
		};

		playbackLastTimestamp = null;
		playbackFrameId = requestAnimationFrame(stepPlayback);

		isPlaying = true;
	};

	const togglePlayback = () => {
		if (isPlaying) {
			stopPlayback();
			return;
		}
		startPlayback();
	};

	// レイヤーIDまたは時刻候補数が変わったときだけ、保存済み状態の復元を試みる。
	$effect(() => {
		touchDependencies(layerEntry.id, temporalItems.length, temporalKeys.length);
		stopPlayback();
		cameraTracker.invalidate();
		restoreTemporalFilterState();
	});

	// UI で変えた時間フィルター範囲を entry.state に同期し、
	// 再生中の即時反映はruntimeへ渡す。
	$effect(() => {
		temporalFilterState.mode = singleStartFilterMode ? 'single_start' : 'range';
		if (singleStartFilterMode) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}
	});

	$effect(() => {
		if (temporalItems.length === 0) return;
		touchDependencies(
			temporalFilterState.enabled,
			temporalFilterState.startIndex,
			temporalFilterState.endIndex,
			temporalFilterState.mode,
			temporalKeys
		);
		const currentTemporalFilter = layerEntry.state?.temporalFilter;

		if (
			!currentTemporalFilter ||
			currentTemporalFilter.enabled !== temporalFilterState.enabled ||
			currentTemporalFilter.startIndex !== temporalFilterState.startIndex ||
			currentTemporalFilter.endIndex !== temporalFilterState.endIndex ||
			currentTemporalFilter.mode !== temporalFilterState.mode
		) {
			layerEntry.state = {
				...layerEntry.state,
				temporalFilter: { ...temporalFilterState }
			};
		}
		applyTemporalFilter(layerEntry);
	});

	// カメラ追跡は、同じレイヤー・同じ時刻に対しては再実行しない。
	// 追跡対象が変わったときだけ移動する。
	$effect(() => {
		if (
			!canTrackCamera ||
			!cameraTrackingState.enabled ||
			!temporalFilterState.enabled ||
			temporalItems.length === 0
		) {
			lastTrackedTarget = null;
			cameraTracker.reset();
			cameraTracker.resetTerrain();
			return;
		}
		touchDependencies(activeTemporalIndex);
		const currentValue = temporalItems[activeTemporalIndex]?.raw;
		if (!currentValue) return;
		const nextTrackedTarget = `${layerEntry.id}:${currentValue}`;
		if (lastTrackedTarget === nextTrackedTarget) return;
		lastTrackedTarget = nextTrackedTarget;
		if (isPlaying) return;
		if (isRouteTrackingMode && cameraTracker.trackRoute(activeTemporalIndex, 0)) {
			return;
		}
		cameraTracker.trackCurrentFeature();
	});

	$effect(() => {
		touchDependencies(temporalItems.length, activeTemporalIndex, loopPlayback);
		if (
			temporalItems.length === 0 ||
			(!loopPlayback && activeTemporalIndex >= temporalItems.length - 1)
		) {
			stopPlayback();
		}
	});

	onDestroy(() => {
		stopPlayback();
		cameraTracker.invalidate();
	});
</script>

{#if temporalConfig}
	<Accordion
		label="時間フィルター"
		icon="mdi:timeline-clock-outline"
		bind:value={showDimensionOption}
	>
		{#if temporalItems.length > 0}
			<div class="flex flex-col w-full">
				<Switch label="時間フィルターを有効化" bind:value={temporalFilterState.enabled} />
				{#if temporalFilterState.enabled}
					<div transition:slide class="flex flex-col w-full">
						{#if canTrackCamera}
							<Switch label="カメラ追跡" bind:value={cameraTrackingState.enabled} />
							{#if cameraTrackingState.enabled}
								<div class="mt-2 rounded-lg bg-black/20 p-3">
									<div class="mb-2 text-xs text-white/70">追跡方法</div>
									<div class="flex gap-2">
										<button
											type="button"
											class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${
												activeCameraTrackingMode === 'feature'
													? 'bg-main-accent text-white'
													: 'bg-sub text-white hover:bg-white/10'
											}`}
											aria-pressed={activeCameraTrackingMode === 'feature'}
											onclick={() => {
												cameraTrackingModeOverride = 'feature';
												cameraTracker.reset();
												lastTrackedTarget = null;
											}}
										>
											点ごと
										</button>
										<button
											type="button"
											class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${
												activeCameraTrackingMode === 'route'
													? 'bg-main-accent text-white'
													: 'bg-sub text-white hover:bg-white/10'
											}`}
											aria-pressed={activeCameraTrackingMode === 'route'}
											onclick={() => {
												cameraTrackingModeOverride = 'route';
												cameraTracker.reset();
												lastTrackedTarget = null;
											}}
										>
											ルート
										</button>
										<button
											type="button"
											class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${
												activeCameraTrackingMode === 'route_auto_bearing'
													? 'bg-main-accent text-white'
													: 'bg-sub text-white hover:bg-white/10'
											}`}
											aria-pressed={activeCameraTrackingMode === 'route_auto_bearing'}
											onclick={() => {
												cameraTrackingModeOverride = 'route_auto_bearing';
												cameraTracker.reset();
												lastTrackedTarget = null;
											}}
										>
											自動角度ルート
										</button>
									</div>
									<div class="mb-2 text-xs text-white/70">
										{activeCameraTrackingMode === 'route_auto_bearing'
											? 'ルート追跡しながら進行方向へ自動で角度を合わせます。'
											: isRouteTrackingMode
												? 'ルート追跡で移動します。'
												: '各時点の地物へ移動します。'}
									</div>
									<RangeSlider
										label="移動時間"
										bind:value={cameraTrackingDurationMs}
										min={80}
										max={800}
										step={10}
										isInt={true}
									/>
									<div class="mt-[-8px] pb-2 text-right text-xs text-white/70">
										短いほど速くなります
									</div>
								</div>
							{/if}
						{/if}
						<Switch label="開始時刻のみで絞る" bind:value={singleStartFilterMode} />
						{#if !isSingleStartFilterMode}
							<RangeSliderDouble
								label="時間範囲"
								lowerLabel="開始"
								upperLabel="終了"
								lowerDisplayValue={temporalItems[temporalFilterState.startIndex]?.label}
								upperDisplayValue={temporalItems[temporalFilterState.endIndex]?.label}
								min={0}
								max={Math.max(temporalItems.length - 1, 0)}
								step={1}
								bind:lowerValue={temporalFilterState.startIndex}
								bind:upperValue={temporalFilterState.endIndex}
								onChange={handleRangeInput}
								disabled={!temporalFilterState.enabled}
							/>
						{:else}
							<RangeSlider
								label="開始"
								min={0}
								max={Math.max(temporalItems.length - 1, 0)}
								step={1}
								isInt={true}
								showValue={false}
								bind:value={temporalFilterState.startIndex}
								onInput={handleStartInput}
								disabled={!temporalFilterState.enabled}
							/>
							<div class="mt-[-8px] pb-4 text-right text-sm text-white">
								{temporalItems[temporalFilterState.startIndex]?.label}
							</div>
						{/if}

						<div class="mt-4 flex items-center justify-center gap-3">
							<button
								onclick={togglePlayback}
								class="bg-sub flex w-[200px] cursor-pointer items-center justify-center gap-1 rounded-full p-1 text-sm text-white select-none hover:bg-white/10"
								aria-label={isPlaying ? '停止' : '再生'}
								disabled={temporalItems.length === 0}
							>
								{#if isPlaying}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
									>
										<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
									</svg>
									停止
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
									>
										<path fill="currentColor" d="M8 5v14l11-7z" />
									</svg>
									再生
								{/if}
							</button>
							<button
								type="button"
								onclick={() => {
									loopPlayback = !loopPlayback;
								}}
								class="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-4 py-1 text-sm text-white transition-colors duration-150 select-none {loopPlayback
									? 'bg-main-accent'
									: 'bg-sub hover:bg-white/10'}"
								aria-pressed={loopPlayback}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
									<path
										fill="currentColor"
										d="M17 17H7v-3l-4 4l4 4v-3h12a2 2 0 0 0 2-2v-4h-2zm0-10H5a2 2 0 0 0-2 2v4h2V9h10v3l4-4l-4-4z"
									/>
								</svg>
								ループ
							</button>
						</div>

						<div class="m-4">
							<RangeSlider
								label="再生速度"
								min={1}
								max={2000}
								step={1}
								isInt={true}
								bind:value={playbackSpeed}
							/>
						</div>

						<!-- <div class="m-2 flex items-center justify-center">
							<button
								onclick={resetTemporalFilter}
								class="c-btn-sub cursor-pointer p-3 text-sm select-none"
							>
								時間フィルターをリセット
							</button>
						</div> -->
					</div>
				{/if}
			</div>
		{:else}
			<div class="rounded-lg bg-black/20 p-3 text-base/80 text-sm">
				時間フィールドは設定されていますが、利用できる日時データが見つかりません。
			</div>
		{/if}
	</Accordion>
{/if}

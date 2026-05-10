<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { LngLat, type ExpressionSpecification, type FilterSpecification } from 'maplibre-gl';
	import { onDestroy } from 'svelte';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import type {
		VectorEntry,
		GeoJsonMetaData,
		TileMetaData,
		VectorTemporalFilterState
	} from '$routes/map/data/types/vector';
	import type { VectorTemporalItem } from '$routes/map/data/types/vector/properties';
	import type { Feature } from '$routes/map/types/geojson';
	import type { AnyGeometry } from '$routes/map/types/geometry';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import { HighlightLayerRegistry } from '$routes/map/utils/layers/highlight';
	import { createSublayerId } from '$routes/map/utils/layers/id';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: VectorEntry<GeoJsonMetaData | TileMetaData>;
		showTemporalOption: boolean;
	}

	interface TemporalTrackPoint {
		raw: string;
		lng: number;
		lat: number;
		bearing: number | null;
	}

	// 時間フィルターの初期状態。
	// 実際の選択範囲は、時間候補数が分かった後に補正する。
	const createDefaultTemporalFilterState = (): VectorTemporalFilterState => ({
		enabled: false,
		startIndex: 0,
		endIndex: 0
	});

	let { layerEntry = $bindable(), showTemporalOption = $bindable() }: Props = $props();

	let temporalFilterState = $state<VectorTemporalFilterState>(createDefaultTemporalFilterState());
	let cameraTracking = $state(false);
	let isPlaying = $state(false);
	let playbackIntervalMs = $state(800);
	let restoredLayerId = $state<string | null>(null);
	let lastTrackedTarget = $state<string | null>(null);
	let playbackFrameId: number | null = null;
	let playbackLastTimestamp: number | null = null;
	let smoothedCameraCenter: LngLat | null = null;
	let smoothedCameraBearing: number | null = null;

	// 時間軸の定義は properties.temporal を正とし、
	// 既存データのために attributeView.timeKey も後方互換で見る。
	const temporalConfig = $derived(
		(layerEntry.properties.temporal ??
			(layerEntry.properties.attributeView.timeKey
				? { key: layerEntry.properties.attributeView.timeKey }
				: undefined)) as typeof layerEntry.properties.temporal | undefined
	);

	// 複数の時間キー候補がある場合でも、比較用の参照順をここで一本化する。
	const temporalKeys = $derived.by(() => {
		const keys = [temporalConfig?.key, ...(temporalConfig?.alternateKeys ?? [])].filter(
			(key): key is string => Boolean(key)
		);
		return Array.from(new Set(keys));
	});

	// スライダーの目盛りは、読み込み時に作った時刻一覧をそのまま使う。
	const temporalItems = $derived.by(() => {
		return (layerEntry.properties.temporal?.items ?? []) as VectorTemporalItem[];
	});

	const canTrackCamera = $derived(layerEntry.format.type === 'geojson');

	const clamp = (value: number, min: number, max: number) => {
		return Math.min(Math.max(value, min), max);
	};

	const lerp = (start: number, end: number, amount: number) => {
		return start + (end - start) * amount;
	};

	const normalizeBearing = (bearing: number) => {
		return ((((bearing + 180) % 360) + 360) % 360) - 180;
	};

	const interpolateBearing = (start: number, end: number, amount: number) => {
		const delta = normalizeBearing(end - start);
		return normalizeBearing(start + delta * amount);
	};

	const getBearingBetweenPoints = (
		from: { lng: number; lat: number },
		to: { lng: number; lat: number }
	) => {
		const fromLat = (from.lat * Math.PI) / 180;
		const toLat = (to.lat * Math.PI) / 180;
		const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
		const y = Math.sin(deltaLng) * Math.cos(toLat);
		const x =
			Math.cos(fromLat) * Math.sin(toLat) -
			Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

		return normalizeBearing((Math.atan2(y, x) * 180) / Math.PI);
	};

	// ベースレイヤーに加えて、色分けやラベルなどの派生サブレイヤーにも
	// 同じ時間フィルターをかけるため、対象レイヤーIDをまとめる。
	const targetLayerIds = $derived.by(() => {
		const ids = [layerEntry.id];
		const { style } = layerEntry;

		if (style.type === 'circle') {
			if (style.imageIcon?.show) {
				return ids;
			}
			if (style.colors.show) {
				ids.push(createSublayerId(layerEntry.id, 'point_icon'));
			}
			if (style.labels.show) {
				ids.push(createSublayerId(layerEntry.id, 'label'));
			}
			return ids;
		}

		if (style.type === 'line') {
			if (style.colors.show) {
				ids.push(createSublayerId(layerEntry.id, 'line_pattern'));
			}
			if (style.labels.show) {
				ids.push(createSublayerId(layerEntry.id, 'label'));
			}
			return ids;
		}

		if (style.type === 'fill') {
			if (style.extrusion?.show) {
				if (style.colors.show) {
					ids.push(createSublayerId(layerEntry.id, 'fill_extrusion_pattern'));
				}
			} else if (style.colors.show) {
				ids.push(createSublayerId(layerEntry.id, 'fill_pattern'));
			}

			if (style.outline.show) {
				ids.push(createSublayerId(layerEntry.id, 'fill_outline'));
			}
			if (style.extrusion?.show) {
				ids.push(createSublayerId(layerEntry.id, 'fill_extrusion'));
			}
			if (style.labels.show) {
				ids.push(createSublayerId(layerEntry.id, 'label'));
			}
		}

		return ids;
	});

	// MapLibre の filter 式で時間属性を読むための expression。
	// 代替キーがある場合は coalesce で最初に見つかった値を使う。
	const temporalExpression = $derived.by((): ExpressionSpecification | null => {
		if (temporalKeys.length === 0) return null;
		if (temporalKeys.length === 1) return ['get', temporalKeys[0]] as ExpressionSpecification;
		return [
			'coalesce',
			...temporalKeys.map((key) => ['get', key]),
			''
		] as unknown as ExpressionSpecification;
	});

	// 1フィーチャーから、時間比較に使う文字列値を取り出す。
	const getFeatureTemporalValue = (properties: Record<string, unknown> | null | undefined) => {
		if (!properties) return null;

		for (const key of temporalKeys) {
			const value = properties[key];
			if (value == null || String(value) === '') continue;
			return String(value);
		}

		return null;
	};

	// カメラ追跡用に、現在の終了時刻に対応するフィーチャーを1件拾う。
	const getCurrentTemporalFeature = () => {
		if (!canTrackCamera) return null;

		const currentValue = temporalItems[temporalFilterState.endIndex]?.raw;
		if (!currentValue) return null;

		const geojson = GeojsonCache.get(layerEntry.id);
		if (!geojson) return null;

		return (
			geojson.features.find((feature) => {
				const properties = feature.properties as Record<string, unknown> | null | undefined;
				return getFeatureTemporalValue(properties) === currentValue;
			}) ?? null
		);
	};

	const getFeatureTrackingPoint = (feature: Feature<AnyGeometry>): TemporalTrackPoint | null => {
		if (!feature.geometry) return null;

		if (feature.geometry.type === 'Point') {
			const [lng, lat] = feature.geometry.coordinates;
			const bearing = Number(
				(feature.properties as Record<string, unknown> | null | undefined)?.angle
			);

			return {
				raw: getFeatureTemporalValue(feature.properties as Record<string, unknown> | null | undefined) ?? '',
				lng,
				lat,
				bearing: Number.isFinite(bearing) ? bearing : null
			};
		}

		if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates.length > 0) {
			const [lng, lat] = feature.geometry.coordinates[0];
			const bearing = Number(
				(feature.properties as Record<string, unknown> | null | undefined)?.angle
			);

			return {
				raw: getFeatureTemporalValue(feature.properties as Record<string, unknown> | null | undefined) ?? '',
				lng,
				lat,
				bearing: Number.isFinite(bearing) ? bearing : null
			};
		}

		return null;
	};

	const temporalTrackPoints = $derived.by(() => {
		if (!canTrackCamera || temporalItems.length === 0) return [] as TemporalTrackPoint[];

		const geojson = GeojsonCache.get(layerEntry.id);
		if (!geojson) return [] as TemporalTrackPoint[];

		const pointsByRaw = new Map<string, TemporalTrackPoint>();
		for (const feature of geojson.features) {
			const trackPoint = getFeatureTrackingPoint(feature as Feature<AnyGeometry>);
			if (!trackPoint || trackPoint.raw === '' || pointsByRaw.has(trackPoint.raw)) continue;
			pointsByRaw.set(trackPoint.raw, trackPoint);
		}

		return temporalItems
			.map((item) => pointsByRaw.get(item.raw))
			.filter((point): point is TemporalTrackPoint => point != null);
	});

	const resetCameraTrackingState = () => {
		smoothedCameraCenter = null;
		smoothedCameraBearing = null;
	};

	const updateCameraTracking = (targetPoint: { lng: number; lat: number }, targetBearing: number) => {
		const map = mapStore.getMap();
		if (!map) return;

		const center = smoothedCameraCenter ?? map.getCenter();
		const bearing = smoothedCameraBearing ?? map.getBearing();
		const smoothing = 0.18;

		smoothedCameraCenter = new LngLat(
			lerp(center.lng, targetPoint.lng, smoothing),
			lerp(center.lat, targetPoint.lat, smoothing)
		);
		smoothedCameraBearing = interpolateBearing(bearing, targetBearing, 0.14);

		map.jumpTo({
			center: smoothedCameraCenter,
			bearing: smoothedCameraBearing
		});
	};

	const trackCameraAlongRoute = (index: number, segmentProgress = 0) => {
		if (temporalTrackPoints.length === 0) return false;

		const currentIndex = clamp(index, 0, temporalTrackPoints.length - 1);
		const currentPoint = temporalTrackPoints[currentIndex];
		if (!currentPoint) return false;

		const nextPoint = temporalTrackPoints[Math.min(currentIndex + 1, temporalTrackPoints.length - 1)];
		const lookAheadPoint =
			temporalTrackPoints[Math.min(currentIndex + 2, temporalTrackPoints.length - 1)] ?? nextPoint;
		const progress = clamp(segmentProgress, 0, 1);

		const interpolatedPoint = {
			lng: nextPoint ? lerp(currentPoint.lng, nextPoint.lng, progress) : currentPoint.lng,
			lat: nextPoint ? lerp(currentPoint.lat, nextPoint.lat, progress) : currentPoint.lat
		};

		const computedBearing =
			currentPoint.bearing ??
			(nextPoint && lookAheadPoint
				? getBearingBetweenPoints(interpolatedPoint, progress > 0.6 ? lookAheadPoint : nextPoint)
				: mapStore.getBearing());

		updateCameraTracking(interpolatedPoint, computedBearing ?? mapStore.getBearing());
		return true;
	};

	// 点はその座標へ、線や面は bbox へカメラを寄せる。
	const trackCameraToFeature = (feature: Feature<AnyGeometry>) => {
		if (!feature.geometry) return;

		if (feature.geometry.type === 'Point') {
			const coordinates = feature.geometry.coordinates;
			const bearing = Number(
				(feature.properties as Record<string, unknown> | null | undefined)?.angle
			);
			mapStore.panTo(new LngLat(coordinates[0], coordinates[1]), {
				duration: 500,
				bearing: !Number.isNaN(bearing) ? bearing : mapStore.getBearing()
			});

			return;
		}

		if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates.length > 0) {
			const [lng, lat] = feature.geometry.coordinates[0];
			const bearing = Number(
				(feature.properties as Record<string, unknown> | null | undefined)?.angle
			);
			mapStore.panTo(new LngLat(lng, lat), {
				duration: 500,
				bearing: !Number.isNaN(bearing) ? bearing : mapStore.getBearing()
			});
			return;
		}

		const bbox = turfBbox(feature) as [number, number, number, number];
		mapStore.fitBounds(bbox, {
			padding: 48,
			duration: 800,
			animate: true
		});
	};

	// 現在の開始・終了インデックスから filter 式を組み立てて、
	// 表示中の実レイヤーへ命令的に適用する。
	const applyTemporalFilter = () => {
		const startValue = temporalItems[temporalFilterState.startIndex]?.raw;
		const endValue = temporalItems[temporalFilterState.endIndex]?.raw;

		let filter: FilterSpecification | null = null;
		if (temporalFilterState.enabled && temporalExpression && startValue && endValue) {
			filter = [
				'all',
				['>=', temporalExpression, startValue],
				['<=', temporalExpression, endValue]
			] as unknown as FilterSpecification;
		}

		// 地物クリック時のハイライト更新でも同じ時間条件を維持できるよう、
		// registry に保持している実行時 filter も同期する。
		HighlightLayerRegistry.setRuntimeFilter(layerEntry.id, filter);

		for (const layerId of targetLayerIds) {
			if (!mapStore.getLayer(layerId)) continue;
			mapStore.setFilter(layerId, filter);
		}
	};

	// レイヤー切り替え時に、entry.state に保存してある時間フィルター状態を復元する。
	const restoreTemporalFilterState = () => {
		if (restoredLayerId === layerEntry.id) return;

		const savedState = layerEntry.state?.temporalFilter;
		if (savedState && temporalItems.length > 0) {
			temporalFilterState = {
				enabled: savedState.enabled,
				startIndex: Math.min(savedState.startIndex, temporalItems.length - 1),
				endIndex: Math.min(savedState.endIndex, temporalItems.length - 1)
			};
		} else {
			temporalFilterState = {
				...createDefaultTemporalFilterState(),
				endIndex: Math.max(temporalItems.length - 1, 0)
			};
		}

		restoredLayerId = layerEntry.id;
	};

	// UI と追跡状態を初期値へ戻す。
	const resetTemporalFilter = () => {
		stopPlayback();
		cameraTracking = false;
		lastTrackedTarget = null;
		resetCameraTrackingState();
		temporalFilterState = {
			...createDefaultTemporalFilterState(),
			endIndex: Math.max(temporalItems.length - 1, 0)
		};
	};

	// 開始側が終了側を追い越したら、終了側を押し出す。
	const handleStartInput = () => {
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

	const stopPlayback = () => {
		if (playbackFrameId !== null) {
			cancelAnimationFrame(playbackFrameId);
			playbackFrameId = null;
		}
		playbackLastTimestamp = null;
		isPlaying = false;
		resetCameraTrackingState();
	};

	const startPlayback = () => {
		if (temporalItems.length === 0) return;
		stopPlayback();

		if (!temporalFilterState.enabled) {
			temporalFilterState.enabled = true;
		}

		if (temporalFilterState.endIndex >= temporalItems.length - 1) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}

		const stepPlayback = (timestamp: number) => {
			if (playbackLastTimestamp === null) {
				playbackLastTimestamp = timestamp;
			}

			while (timestamp - playbackLastTimestamp >= playbackIntervalMs) {
				playbackLastTimestamp += playbackIntervalMs;
				if (temporalFilterState.endIndex >= temporalItems.length - 1) {
					stopPlayback();
					return;
				}
				temporalFilterState.endIndex += 1;
			}

			if (cameraTracking && temporalTrackPoints.length > 0) {
				const segmentProgress = clamp(
					(timestamp - playbackLastTimestamp) / Math.max(playbackIntervalMs, 1),
					0,
					1
				);
				trackCameraAlongRoute(temporalFilterState.endIndex, segmentProgress);
			}

			if (temporalFilterState.endIndex >= temporalItems.length - 1) {
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
		layerEntry.id;
		temporalItems.length;
		stopPlayback();
		restoreTemporalFilterState();
	});

	// UI で変えた時間フィルター範囲を entry.state に同期し、
	// あわせて map.setFilter() で即時反映する。
	$effect(() => {
		if (temporalItems.length === 0) return;
		temporalFilterState.enabled;
		temporalFilterState.startIndex;
		temporalFilterState.endIndex;
		targetLayerIds;
		temporalExpression;
		const currentTemporalFilter = layerEntry.state?.temporalFilter;

		if (
			!currentTemporalFilter ||
			currentTemporalFilter.enabled !== temporalFilterState.enabled ||
			currentTemporalFilter.startIndex !== temporalFilterState.startIndex ||
			currentTemporalFilter.endIndex !== temporalFilterState.endIndex
		) {
			layerEntry.state = {
				...layerEntry.state,
				temporalFilter: { ...temporalFilterState }
			};
		}
		applyTemporalFilter();
	});

	// カメラ追跡は、同じレイヤー・同じ時刻に対しては再実行しない。
	// 追跡対象が変わったときだけ移動する。
	$effect(() => {
		if (
			!canTrackCamera ||
			!cameraTracking ||
			!temporalFilterState.enabled ||
			temporalItems.length === 0
		) {
			lastTrackedTarget = null;
			resetCameraTrackingState();
			return;
		}
		temporalFilterState.endIndex;
		temporalTrackPoints.length;
		const currentValue = temporalItems[temporalFilterState.endIndex]?.raw;
		if (!currentValue) return;
		const nextTrackedTarget = `${layerEntry.id}:${currentValue}`;
		if (lastTrackedTarget === nextTrackedTarget) return;
		lastTrackedTarget = nextTrackedTarget;
		if (isPlaying && temporalTrackPoints.length > 0) return;
		if (trackCameraAlongRoute(temporalFilterState.endIndex, 0)) return;
		const feature = getCurrentTemporalFeature();
		if (!feature) return;
		trackCameraToFeature(feature as Feature<AnyGeometry>);
	});

	$effect(() => {
		temporalItems.length;
		temporalFilterState.endIndex;
		if (temporalItems.length === 0 || temporalFilterState.endIndex >= temporalItems.length - 1) {
			stopPlayback();
		}
	});

	onDestroy(() => {
		stopPlayback();
	});
</script>

{#if temporalConfig}
	<Accordion
		label="時間フィルター"
		icon="mdi:timeline-clock-outline"
		bind:value={showTemporalOption}
	>
		{#if temporalItems.length > 0}
			<div class="flex flex-col gap-4">
				<Switch label="時間フィルターを有効化" bind:value={temporalFilterState.enabled} />
				{#if canTrackCamera}
					<Switch label="カメラ追跡" bind:value={cameraTracking} />
				{/if}

				<div class="rounded-lg bg-black/20 p-3">
					<div class="text-base/80 text-sm">開始</div>
					<div class="mt-1 text-sm text-white">
						{temporalItems[temporalFilterState.startIndex]?.label}
					</div>
					<input
						type="range"
						min="0"
						max={Math.max(temporalItems.length - 1, 0)}
						step="1"
						bind:value={temporalFilterState.startIndex}
						oninput={handleStartInput}
						class="mt-2 w-full cursor-pointer"
						disabled={!temporalFilterState.enabled}
					/>
				</div>

				<div class="rounded-lg bg-black/20 p-3">
					<div class="text-base/80 text-sm">終了</div>
					<div class="mt-1 text-sm text-white">
						{temporalItems[temporalFilterState.endIndex]?.label}
					</div>
					<input
						type="range"
						min="0"
						max={Math.max(temporalItems.length - 1, 0)}
						step="1"
						bind:value={temporalFilterState.endIndex}
						oninput={handleEndInput}
						class="mt-2 w-full cursor-pointer"
						disabled={!temporalFilterState.enabled}
					/>
				</div>

				<div class="flex items-center justify-center gap-2">
					<button
						onclick={togglePlayback}
						class="bg-sub flex w-[200px] cursor-pointer items-center justify-center gap-1 rounded-full p-1 text-sm text-white hover:bg-white/10"
						aria-label={isPlaying ? '停止' : '再生'}
						disabled={temporalItems.length === 0}
					>
						{#if isPlaying}
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
								<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
							</svg>
							停止
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
								<path fill="currentColor" d="M8 5v14l11-7z" />
							</svg>
							再生
						{/if}
					</button>
				</div>

				<RangeSlider
					label="再生間隔"
					min={1}
					max={2000}
					step={1}
					isInt={true}
					bind:value={playbackIntervalMs}
				/>

				<button onclick={resetTemporalFilter} class="c-btn-sub cursor-pointer p-3 text-sm">
					時間フィルターをリセット
				</button>
			</div>
		{:else}
			<div class="rounded-lg bg-black/20 p-3 text-base/80 text-sm">
				時間フィールドは設定されていますが、利用できる日時データが見つかりません。
			</div>
		{/if}
	</Accordion>
{/if}

<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { LngLat, type ExpressionSpecification, type FilterSpecification } from 'maplibre-gl';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
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
	let restoredLayerId = $state<string | null>(null);
	let lastTrackedTarget = $state<string | null>(null);

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

	// 点はその座標へ、線や面は bbox へカメラを寄せる。
	const trackCameraToFeature = (feature: Feature<AnyGeometry>) => {
		if (!feature.geometry) return;

		if (feature.geometry.type === 'Point') {
			const coordinates = feature.geometry.coordinates;
			mapStore.panToOrJumpTo(new LngLat(coordinates[0], coordinates[1]));
			return;
		}

		if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates.length > 0) {
			const [lng, lat] = feature.geometry.coordinates[0];
			mapStore.panToOrJumpTo(new LngLat(lng, lat));
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
		cameraTracking = false;
		lastTrackedTarget = null;
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

	// レイヤーIDまたは時刻候補数が変わったときだけ、保存済み状態の復元を試みる。
	$effect(() => {
		layerEntry.id;
		temporalItems.length;
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
		if (!canTrackCamera || !cameraTracking || !temporalFilterState.enabled || temporalItems.length === 0) {
			lastTrackedTarget = null;
			return;
		}
		temporalFilterState.endIndex;
		const currentValue = temporalItems[temporalFilterState.endIndex]?.raw;
		if (!currentValue) return;
		const nextTrackedTarget = `${layerEntry.id}:${currentValue}`;
		if (lastTrackedTarget === nextTrackedTarget) return;
		const feature = getCurrentTemporalFeature();
		if (!feature) return;
		lastTrackedTarget = nextTrackedTarget;
		trackCameraToFeature(feature as Feature<AnyGeometry>);
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

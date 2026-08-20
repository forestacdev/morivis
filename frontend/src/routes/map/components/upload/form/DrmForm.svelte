<script lang="ts">
	import turfBbox from '@turf/bbox'

	import { createGeoJsonEntry } from '$routes/map/data/entries/vector'
	import type { MorivisLayerEntry } from '$routes/map/data/types'
	import type { FeatureCollection } from '$routes/map/types/geojson'
	import type { DialogType, UploadFilesInput } from '$routes/map/types'
	import { analyzeDrmFilesInWorker } from '$routes/map/utils/formats/drm/analyze'
	import {
		CRS_JGD2000,
		CRS_TOKYO,
		detectCrs,
		detectCrsCandidates,
		getDrmInputName,
		getDrmRootName
	} from '$routes/map/utils/formats/drm'
	import { isBboxValid } from '$routes/map/utils/map/bbox'
	import { transformGeoJSONParallel } from '$routes/map/utils/proj'
	import { getProjContext } from '$routes/map/utils/proj/dict'
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common'
	import { showNotification } from '$routes/stores/notification'
	import { isProcessing } from '$routes/stores/ui'

	interface Props {
		showDataEntry: MorivisLayerEntry | null
		showDialogType: DialogType
		dropFile: UploadFilesInput
	}

	const TOKYO_DATUM_PROJ4 =
		'+proj=longlat +ellps=bessel +towgs84=-146.414,507.337,680.507,0,0,0,0 +no_defs +type=crs'

	const CRS_LABELS: Record<string, string> = {
		[CRS_TOKYO]: '旧日本測地系',
		[CRS_JGD2000]: 'JGD2000'
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props()

	const getSuggestedEntryName = (files: File[]): string => {
		const firstFile = files[0]
		if (!firstFile) return 'DRMデータ'
		return getDrmRootName(getDrmInputName(firstFile)) || 'DRMデータ'
	}

	const allFiles = $derived(toUploadFiles(dropFile))
	const drmFiles = $derived.by(() =>
		allFiles.filter((file) => /\.mt$/i.test(getDrmInputName(file)))
	)
	const drmInputNames = $derived.by(() => drmFiles.map((file) => getDrmInputName(file)))
	const crsCandidates = $derived.by(() => detectCrsCandidates(...drmInputNames))
	const detectedCrs = $derived(detectCrs(...drmInputNames))
	const hasMixedCrs = $derived(crsCandidates.length > 1)
	const suggestedEntryName = $derived(getSuggestedEntryName(drmFiles))

	const getCrsLabel = (crs: string): string => CRS_LABELS[crs] ?? crs

	const getProjContextByCrs = (crs: string): string =>
		crs === CRS_JGD2000 ? getProjContext('4612') : TOKYO_DATUM_PROJ4

	const getEntryGeometryType = (geojson: FeatureCollection): 'Point' | 'LineString' => {
		const geometryType = geojson.features[0]?.geometry?.type
		return geometryType === 'Point' || geometryType === 'MultiPoint' ? 'Point' : 'LineString'
	}

	const getFeatureLabel = (entryGeometryType: 'Point' | 'LineString'): string =>
		entryGeometryType === 'Point' ? 'ノード' : '道路リンク'

	const closeDialog = () => {
		dropFile = null
		showDialogType = null
	}

	const closeWithNotification = (
		message: string,
		level: 'error' | 'info' | 'warning' | 'success'
	) => {
		showNotification(message, level)
		closeDialog()
	}

	const registration = async () => {
		if (drmFiles.length === 0) {
			closeWithNotification('DRMの .mt ファイルが見つかりませんでした', 'warning')
			return
		}

		if (hasMixedCrs) {
			closeWithNotification('旧日本測地系版とJGD2000版の DRM を同時には読み込めません', 'error')
			return
		}

		isProcessing.set(true)

		try {
			const { geojson } = await analyzeDrmFilesInWorker(drmFiles, {
				includeAllRoads: true
			})

			if (geojson.features.length === 0) {
				closeWithNotification('読み込めるDRMデータが見つかりませんでした', 'warning')
				return
			}

			const sourceCrs = geojson.crs ?? detectedCrs
			const transformedGeojson = (await transformGeoJSONParallel(
				geojson,
				getProjContextByCrs(sourceCrs)
			)) as FeatureCollection
			const entryGeometryType = getEntryGeometryType(transformedGeojson)
			const featureLabel = getFeatureLabel(entryGeometryType)
			const bbox = turfBbox(transformedGeojson) as [number, number, number, number]

			if (!isBboxValid(bbox)) {
				closeWithNotification('DRMファイルの座標変換に失敗しました', 'error')
				return
			}

			const entry = await createGeoJsonEntry(
				transformedGeojson,
				entryGeometryType,
				suggestedEntryName,
				bbox,
				undefined,
				{ attribution: 'DRM' }
			)

			if (!entry) {
				closeWithNotification('DRMファイルの登録に失敗しました', 'error')
				return
			}

			showDataEntry = entry
			closeDialog()
			showNotification(`${geojson.features.length}件の${featureLabel}を読み込みました`, 'success')
		} catch (error) {
			closeDialog()
			showNotification(
				error instanceof Error ? error.message : 'DRMファイルの読み込みに失敗しました',
				'error'
			)
			console.error(error)
		} finally {
			isProcessing.set(false)
		}
	}

	if (showDialogType === 'drm') {
		queueMicrotask(() => {
			if (drmFiles.length === 0) return
			void registration()
		})
	}
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">DRM .mt ファイルを読み込み中</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col justify-center gap-6 overflow-x-hidden overflow-y-auto p-2"
>
	<div class="w-full space-y-4 text-sm">
		<div class="space-y-1 text-gray-300">
			<div>対象 .mt ファイル: {drmFiles.length}件</div>
			<div>道路網: すべて自動で読み込みます</div>
			<div>読込対象: 線があれば道路リンク、無ければノードを読み込みます</div>
			<div>測地系: {getCrsLabel(detectedCrs)}</div>
		</div>

		<p class="text-sm text-gray-200">エントリーを自動作成しています。</p>

		{#if hasMixedCrs}
			<p class="text-sm text-red-300">
				旧日本測地系版と JGD2000 版が混在しているため、自動処理を中止します。
			</p>
		{/if}
	</div>
</div>

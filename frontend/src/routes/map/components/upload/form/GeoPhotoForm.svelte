<script lang="ts">
	import turfBbox from '@turf/bbox';

	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { parseGeoPhotos, type GeoPhotoFeature } from '$routes/map/utils/formats/exif';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isMobile, isProcessing } from '$routes/stores/ui';
	import { requestPhotoLocation } from '$routes/map/utils/photo-location';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let confirmLocation = $state<((accepted: boolean) => void) | null>(null);
	let missingPhotoCount = $state(0);
	let status = $state('写真を読み込み中...');
	let activeController: AbortController | undefined;

	const photoFiles = $derived.by(() => {
		if (!dropFile) return [];
		const files = toUploadFiles(dropFile);
		return files.filter((f) => /\.(jpe?g|heic|heif|png|webp)$/i.test(f.name));
	});

	$effect(() => {
		const files = photoFiles;
		const mobile = $isMobile;
		if (files.length === 0) return;
		const controller = new AbortController();
		activeController = controller;
		void processPhotos(files, mobile, controller.signal);
		return () => {
			controller.abort();
			confirmLocation?.(false);
			confirmLocation = null;
			isProcessing.set(false);
		};
	});

	const processPhotos = async (files: File[], mobile: boolean, signal: AbortSignal) => {
		isProcessing.set(true);
		status = '写真の位置情報を確認中...';
		let features: GeoPhotoFeature[] = [];
		let registered = false;

		try {
			const result = await parseGeoPhotos(files, {
				signal,
				resolveMissingLocation: mobile
					? async (count) => {
							isProcessing.set(false);
							missingPhotoCount = count;
							const location = await requestPhotoLocation(async () => {
								const accepted = await new Promise<boolean>((resolve) => {
									confirmLocation = resolve;
								});
								if (accepted) status = '現在地を取得中...';
								return accepted;
							}, signal);
							signal.throwIfAborted();
							isProcessing.set(true);
							status = '写真を読み込み中...';
							return location;
						}
					: undefined
			});
			features = result.features;
			signal.throwIfAborted();
			const photoCount = result.features.length;
			const skippedCount = result.skippedCount;

			if (photoCount === 0) {
				if (!mobile) showNotification('位置情報付きの写真が見つかりませんでした', 'error');
				dropFile = null;
				showDialogType = null;
				return;
			}

			// GeoJSON FeatureCollection作成
			const geojson = {
				type: 'FeatureCollection',
				features: result.features
			} as unknown as FeatureCollection;

			const bbox = turfBbox(geojson);
			const entry = await createGeoJsonEntry(
				geojson,
				'Point',
				`写真 (${result.features.length}枚)`,
				bbox as [number, number, number, number],
				undefined,
				{
					attribution: '位置情報付き写真',
					coverImage: result.features[0]?.properties.coverImageUrl
				}
			);

			signal.throwIfAborted();
			if (!entry) throw new Error('写真の登録に失敗しました');

			if (entry) {
				const pointEntry = entry as PointEntry<GeoJsonMetaData>;
				entry.properties.attributeView.titles = [
					{
						conditions: ['fileName'],
						template: '{fileName}'
					}
				];
				pointEntry.properties.images = {
					popup: {
						type: 'absolute',
						urlKey: 'imageUrl'
					},
					icon: {
						type: 'absolute',
						imageIdKey: 'iconImageUrl',
						urlKey: 'iconImageUrl'
					}
				};
				pointEntry.style.imageIcon = {
					show: true
				};

				pointEntry.style.opacity = 1;

				showDataEntry = entry;
				registered = true;
				showDialogType = null;
				dropFile = null;

				if (skippedCount > 0) {
					showNotification(
						`${photoCount}枚の写真を読み込みました（${skippedCount}枚はGPS情報なし）`,
						'success'
					);
				} else {
					showNotification(`${photoCount}枚の写真を読み込みました`, 'success');
				}
			}
		} catch (e) {
			if (signal.aborted) return;
			showNotification(e instanceof Error ? e.message : '写真の読み込みに失敗しました', 'error');
			dropFile = null;
			showDialogType = null;
		} finally {
			if (!registered) {
				const urls = new Set(
					features.flatMap(({ properties }) => [
						properties.imageUrl,
						properties.iconImageUrl,
						properties.coverImageUrl
					])
				);
				for (const url of urls) URL.revokeObjectURL(url);
			}
			if (!signal.aborted) isProcessing.set(false);
		}
	};

	const answerLocation = (accepted: boolean) => {
		const resolve = confirmLocation;
		confirmLocation = null;
		resolve?.(accepted);
	};

	const cancel = () => {
		activeController?.abort();
		answerLocation(false);
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between pb-4">
	<span class="text-2xl font-bold">写真の登録</span>
</div>

<div class="flex w-full grow flex-col gap-4 overflow-y-auto" aria-live="polite">
	{#if confirmLocation}
		<p>{missingPhotoCount}枚の写真に位置情報がありません。端末の現在地を使いますか？</p>
		<p class="text-sm text-gray-400">
			位置情報のない写真を、撮影場所ではなく今いる場所に配置します。「いいえ」を選ぶと、その写真は読み込みません。
		</p>
		<div class="flex justify-center gap-4">
			<button onclick={() => answerLocation(false)} class="c-btn-sub cursor-pointer p-4"
				>いいえ</button
			>
			<button onclick={() => answerLocation(true)} class="c-btn-confirm cursor-pointer p-4"
				>はい</button
			>
		</div>
	{:else}
		<p class="text-sm text-gray-400">{status}</p>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
</div>

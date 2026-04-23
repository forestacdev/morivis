<script lang="ts">
	import turfBbox from '@turf/bbox';

	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { parseGeoPhotos } from '$routes/map/utils/formats/exif';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let photoCount = $state(0);
	let skippedCount = $state(0);
	let thumbnails = $state<{ url: string; name: string }[]>([]);

	const photoFiles = $derived.by(() => {
		if (!dropFile) return [];
		const files = dropFile instanceof FileList ? Array.from(dropFile) : [dropFile];
		return files.filter((f) => /\.(jpe?g|heic|heif)$/i.test(f.name));
	});

	$effect(() => {
		if (photoFiles.length > 0) {
			processPhotos();
		}
	});

	const processPhotos = async () => {
		isProcessing.set(true);

		try {
			const result = await parseGeoPhotos(photoFiles);
			photoCount = result.features.length;
			skippedCount = result.skippedCount;

			if (result.features.length === 0) {
				showNotification('位置情報付きの写真が見つかりませんでした', 'error');
				dropFile = null;
				showDialogType = null;
				return;
			}

			// サムネイル表示用
			thumbnails = result.features.map((f) => ({
				url: f.properties.imageUrl,
				name: f.properties.fileName
			}));

			// GeoJSON FeatureCollection作成
			const geojson = {
				type: 'FeatureCollection',
				features: result.features
			} as unknown as FeatureCollection;

			const bbox = turfBbox(geojson);
			const entry = createGeoJsonEntry(
				geojson,
				'Point',
				`写真 (${result.features.length}枚)`,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: '位置情報付き写真' }
			);

			if (entry) {
				// 画像表示用キーを設定
				entry.properties.attributeView.imageKey = 'imageUrl';
				entry.properties.attributeView.titles = [
					{
						conditions: ['fileName'],
						template: '{fileName}'
					}
				];

				showDataEntry = entry;
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
			showNotification('写真の読み込みに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">位置情報付き写真の登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	{#if $isProcessing}
		<div class="w-full p-2 text-sm text-gray-400">EXIF情報を読み取り中...</div>
	{:else if thumbnails.length > 0}
		<div class="w-full p-2 text-sm text-gray-300">
			{photoCount}枚の写真を検出{skippedCount > 0 ? `（${skippedCount}枚はGPS情報なし）` : ''}
		</div>
		<div class="grid w-full grid-cols-4 gap-1 p-2">
			{#each thumbnails.slice(0, 12) as thumb}
				<div class="aspect-square overflow-hidden rounded">
					<img src={thumb.url} alt={thumb.name} class="h-full w-full object-cover" />
				</div>
			{/each}
			{#if thumbnails.length > 12}
				<div
					class="flex aspect-square items-center justify-center rounded bg-gray-700 text-sm text-gray-300"
				>
					+{thumbnails.length - 12}
				</div>
			{/if}
		</div>
	{:else}
		<div class="w-full p-2 text-sm text-gray-400">写真を読み込み中...</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
</div>

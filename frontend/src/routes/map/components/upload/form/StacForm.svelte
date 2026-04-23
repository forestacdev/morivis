<script lang="ts">
	import { fromUrl } from 'geotiff';
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type {
		RasterImageEntry,
		RasterCogEntry,
		RasterTiffStyle
	} from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import {
		GeoTiffCache,
		encodeAllBandsToTerrarium,
		getMinMax,
		type BandDataRange,
		type RasterBands
	} from '$routes/map/utils/formats/geotiff';
	import { CogTileManager } from '$routes/map/utils/formats/geotiff/cog_tile_manager';
	import {
		detectStacSourceType,
		fetchCollections,
		searchItems,
		fetchChildLinks,
		fetchStaticItems,
		getCogAssets,
		type StacSourceType,
		type StacCollection,
		type StacItem,
		type StacAsset
	} from '$routes/map/utils/formats/stac';
	import { generateThumbnail } from '$routes/map/utils/formats/thumbnail';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	/** URLがCOG直リンクかどうかを判定 */
	const isCogUrl = (url: string): boolean =>
		/\.(tif|tiff|geotiff)(\?.*)?$/i.test(url.split('#')[0]);

	const urlValidation = yup.object().shape({
		url: yup
			.string()
			.required('URLを入力してください。')
			.test('url-format', 'URLの形式が正しくありません', (value) => {
				if (!value) return false;
				return value.startsWith('http://') || value.startsWith('https://');
			})
	});

	type Step = 'url' | 'collection' | 'browse' | 'items';

	let step = $state<Step>('url');
	let apiUrl = $state('');
	let urlErrors = $state<Record<string, string>>({});
	let isUrlValid = $state(false);
	let sourceType = $state<StacSourceType | null>(null);
	let statusText = $state('');

	// API: コレクション
	let collections = $state<StacCollection[]>([]);
	let selectedCollectionId = $state('');

	// API: 検索パラメータ
	let dateFrom = $state('');
	let dateTo = $state('');

	// Static: ブラウズ
	let browseLinks = $state<{ title: string; href: string }[]>([]);
	let browseHistory = $state<string[]>([]);
	let currentBrowseUrl = $state('');

	// 共通: 検索結果
	let items = $state<StacItem[]>([]);
	let selectedItemIndex = $state(0);

	// アセット選択
	let cogAssets = $state<{ key: string; asset: StacAsset }[]>([]);
	let selectedAssetKey = $state('');

	$effect(() => {
		urlValidation
			.validate({ url: apiUrl }, { abortEarly: false })
			.then(() => {
				isUrlValid = true;
				urlErrors = {};
			})
			.catch((error) => {
				isUrlValid = false;
				const newErrors: Record<string, string> = {};
				if (error.inner) {
					error.inner.forEach((err: yup.ValidationError) => {
						if (err.path) newErrors[err.path] = err.message;
					});
				}
				urlErrors = newErrors;
			});
	});

	/** COG URLを直接読み込む */
	const loadCogDirect = async (cogUrl: string) => {
		statusText = 'COGメタデータを読み取り中...';
		const id = `geotiff_${crypto.randomUUID()}`;
		const entryName =
			cogUrl
				.split('/')
				.pop()
				?.replace(/\.(tif|tiff|geotiff)$/i, '') ?? 'COG';
		const {
			metadata: cogMetadata,
			sampleBands,
			sampleWidth,
			sampleHeight
		} = await CogTileManager.register(id, cogUrl);
		const { fullWidth, fullHeight, numBands, bbox, sampleRanges } = cogMetadata;

		const resolvedBbox: [number, number, number, number] = [
			Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[0])),
			Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[1])),
			Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[2])),
			Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[3]))
		];

		const MAX_SIZE = 4096;
		const useTiledMode = fullWidth > MAX_SIZE || fullHeight > MAX_SIZE;

		if (useTiledMode) {
			statusText = `タイル方式で読み込み中... (${fullWidth}x${fullHeight})`;
			GeoTiffCache.setDataRanges(id, sampleRanges);

			const mapImage =
				sampleBands.length > 0
					? generateThumbnail({
							bands: sampleBands,
							width: sampleWidth,
							height: sampleHeight,
							bbox,
							nodata: cogMetadata.nodata,
							ranges: sampleRanges
						})
					: undefined;

			const entry: RasterCogEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: { type: 'cog', url: cogUrl },
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'STAC/COG',
					name: entryName,
					tileSize: cogMetadata.tileSize,
					bounds: resolvedBbox,
					minZoom: cogMetadata.minZoom,
					maxZoom: cogMetadata.maxZoom,
					xyzImageTile: findCenterTile(resolvedBbox),
					mapImage
				},
				interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
				style: {
					type: 'tiff',
					opacity: 1.0,
					visible: true,
					visualization: {
						numBands,
						mode: numBands >= 3 ? 'multi' : 'single',
						uniformsData: {
							single: {
								index: 0,
								min: sampleRanges[0].min,
								max: sampleRanges[0].max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: sampleRanges[0]?.min ?? 0, max: sampleRanges[0]?.max ?? 255 },
								g: {
									index: Math.min(1, numBands - 1),
									min: sampleRanges[1]?.min ?? 0,
									max: sampleRanges[1]?.max ?? 255
								},
								b: {
									index: Math.min(2, numBands - 1),
									min: sampleRanges[2]?.min ?? 0,
									max: sampleRanges[2]?.max ?? 255
								}
							}
						}
					}
				}
			};
			showDataEntry = entry;
			showDialogType = null;
			showNotification('COGをタイル方式で読み込みました', 'success');
		} else {
			statusText = `ラスターデータを読み込み中... (${fullWidth}x${fullHeight})`;
			const tiff = await fromUrl(cogUrl);
			const fullImage = await tiff.getImage();
			const rasters = await fullImage.readRasters();

			const bands: RasterBands = [];
			const ranges: BandDataRange[] = [];
			for (let i = 0; i < numBands; i++) {
				const band = rasters[i] as Float32Array | Uint8Array | Uint16Array;
				bands.push(band);
				ranges.push(getMinMax(band, null));
			}

			const nodata = fullImage.getGDALNoData();
			await encodeAllBandsToTerrarium(id, bands, fullWidth, fullHeight, nodata, ranges);

			GeoTiffCache.setSize(id, fullWidth, fullHeight);
			GeoTiffCache.setNumBands(id, numBands);
			GeoTiffCache.setBbox(id, resolvedBbox);
			GeoTiffCache.markAs4326(id);
			GeoTiffCache.setRawBbox(id, bbox);
			CogTileManager.unregister(id);

			const mapImage = generateThumbnail({
				bands,
				width: fullWidth,
				height: fullHeight,
				bbox,
				nodata,
				ranges
			});
			const entry: RasterImageEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: { type: 'image', url: '' },
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'STAC/COG',
					name: entryName,
					tileSize: 256,
					bounds: resolvedBbox,
					xyzImageTile: findCenterTile(resolvedBbox),
					mapImage
				},
				interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
				style: {
					type: 'tiff',
					opacity: 1.0,
					visible: true,
					visualization: {
						numBands,
						mode: numBands >= 3 ? 'multi' : 'single',
						uniformsData: {
							single: { index: 0, min: ranges[0].min, max: ranges[0].max, colorMap: 'jet' },
							multi: {
								r: { index: 0, min: ranges[0]?.min ?? 0, max: ranges[0]?.max ?? 255 },
								g: {
									index: Math.min(1, numBands - 1),
									min: ranges[1]?.min ?? 0,
									max: ranges[1]?.max ?? 255
								},
								b: {
									index: Math.min(2, numBands - 1),
									min: ranges[2]?.min ?? 0,
									max: ranges[2]?.max ?? 255
								}
							}
						}
					}
				}
			};
			showDataEntry = entry;
			showDialogType = null;
			showNotification('COGを読み込みました', 'success');
		}
	};

	/** Step 1: 接続してソースタイプを自動判定（COG直URLも対応） */
	const connect = async () => {
		isProcessing.set(true);
		statusText = '接続中...';
		try {
			// COG直URLの場合はCOG読み込みフローへ
			if (isCogUrl(apiUrl)) {
				await loadCogDirect(apiUrl);
				return;
			}

			const result = await detectStacSourceType(apiUrl);
			sourceType = result.type;

			if (result.type === 'api') {
				// STAC API → コレクション一覧取得
				collections = await fetchCollections(apiUrl);
				if (collections.length === 0) {
					showNotification('コレクションが見つかりません', 'error');
					return;
				}
				selectedCollectionId = collections[0].id;
				statusText = `STAC API (${collections.length}コレクション)`;
				step = 'collection';
			} else {
				// Static Catalog / Collection → childリンクをブラウズ
				const links = await fetchChildLinks(apiUrl);
				if (links.length === 0) {
					// childがない = 直接アイテムを持つかも
					const foundItems = await fetchStaticItems(apiUrl, 20);
					if (foundItems.length > 0) {
						items = foundItems;
						selectedItemIndex = 0;
						updateCogAssets(0);
						statusText = `${foundItems.length}件のアイテム`;
						step = 'items';
					} else {
						showNotification('アイテムが見つかりません', 'error');
					}
					return;
				}
				browseLinks = links;
				currentBrowseUrl = apiUrl;
				browseHistory = [];
				statusText = `Static Catalog (${links.length}件)`;
				step = 'browse';
			}
		} catch (e) {
			showNotification('接続に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	/** Static: フォルダを開く */
	const openChild = async (href: string) => {
		isProcessing.set(true);
		try {
			const links = await fetchChildLinks(href);
			if (links.length > 0) {
				browseHistory = [...browseHistory, currentBrowseUrl];
				currentBrowseUrl = href;
				browseLinks = links;
				statusText = `${links.length}件`;
			} else {
				// childがない = アイテムを取得
				const foundItems = await fetchStaticItems(href, 20);
				if (foundItems.length > 0) {
					items = foundItems;
					selectedItemIndex = 0;
					updateCogAssets(0);
					statusText = `${foundItems.length}件のアイテム`;
					step = 'items';
				} else {
					showNotification('アイテムが見つかりません', 'error');
				}
			}
		} catch (e) {
			showNotification('読み込みに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	/** Static: 親に戻る */
	const browseBack = async () => {
		if (browseHistory.length === 0) {
			step = 'url';
			return;
		}
		const prev = browseHistory[browseHistory.length - 1];
		browseHistory = browseHistory.slice(0, -1);
		currentBrowseUrl = prev;
		isProcessing.set(true);
		try {
			browseLinks = await fetchChildLinks(prev);
		} finally {
			isProcessing.set(false);
		}
	};

	/** API: アイテム検索 */
	const searchStacItems = async () => {
		isProcessing.set(true);
		try {
			let datetime: string | undefined;
			if (dateFrom && dateTo) {
				datetime = `${dateFrom}T00:00:00Z/${dateTo}T23:59:59Z`;
			} else if (dateFrom) {
				datetime = `${dateFrom}T00:00:00Z/..`;
			} else if (dateTo) {
				datetime = `../${dateTo}T23:59:59Z`;
			}

			const result = await searchItems(apiUrl, {
				collections: [selectedCollectionId],
				datetime,
				limit: 10
			});

			items = result.features;
			if (items.length === 0) {
				showNotification('条件に一致するアイテムが見つかりません', 'error');
				return;
			}

			selectedItemIndex = 0;
			updateCogAssets(0);
			step = 'items';
		} catch (e) {
			showNotification('検索に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const updateCogAssets = (index: number) => {
		const item = items[index];
		if (!item) return;
		cogAssets = getCogAssets(item);
		selectedAssetKey = cogAssets.length > 0 ? cogAssets[0].key : '';
	};

	let progressText = $state('');

	const formatFileSize = (bytes: number): string => {
		if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
		if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${bytes} B`;
	};

	/** COGをロードしてエントリ作成 */
	const loadCog = async () => {
		const item = items[selectedItemIndex];
		const asset = cogAssets.find((a) => a.key === selectedAssetKey)?.asset;
		if (!item || !asset) return;

		isProcessing.set(true);
		progressText = 'ファイル情報を取得中...';
		try {
			// 直接アクセスでCORS確認
			let cogUrl = asset.href;
			try {
				const testRes = await fetch(asset.href, { method: 'HEAD' });
				const contentLength = testRes.headers.get('Content-Length');
				if (contentLength) {
					progressText = `COGヘッダーを取得中... (${formatFileSize(Number(contentLength))})`;
				} else {
					progressText = 'COGヘッダーを取得中...';
				}
			} catch {
				// CORSエラー
				throw new TypeError('Failed to fetch: CORS');
			}

			const id = `geotiff_${crypto.randomUUID()}`;
			const bbox = item.bbox;
			const resolvedBbox: [number, number, number, number] = [
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[0])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[1])),
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[2])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[3]))
			];
			const entryName = item.collection ? `${item.collection}_${item.id}` : item.id;

			// COGメタデータを読み取り
			progressText = 'COGメタデータを読み取り中...';
			const {
				metadata: cogMetadata,
				sampleBands,
				sampleWidth,
				sampleHeight
			} = await CogTileManager.register(id, cogUrl);
			const { fullWidth, fullHeight, numBands, sampleRanges } = cogMetadata;

			const MAX_SIZE = 4096;
			const useTiledMode = fullWidth > MAX_SIZE || fullHeight > MAX_SIZE;

			if (useTiledMode) {
				// タイル方式: CogTileManagerに登録済み、RasterCogEntryを作成
				progressText = `タイル方式で読み込み中... (${fullWidth}x${fullHeight})`;

				// UIスライダー用にデータ範囲を登録
				GeoTiffCache.setDataRanges(id, sampleRanges);

				const ranges = sampleRanges;

				// サムネイル生成
				const mapImage =
					sampleBands.length > 0
						? generateThumbnail({
								bands: sampleBands,
								width: sampleWidth,
								height: sampleHeight,
								bbox,
								nodata: cogMetadata.nodata,
								ranges
							})
						: undefined;

				const entry: RasterCogEntry<RasterTiffStyle> = {
					id,
					type: 'raster',
					format: { type: 'cog', url: cogUrl },
					metaData: {
						...DEFAULT_CUSTOM_META_DATA,
						attribution: 'STAC/COG',
						name: entryName,
						tileSize: cogMetadata.tileSize,
						bounds: resolvedBbox,
						minZoom: cogMetadata.minZoom,
						maxZoom: cogMetadata.maxZoom,
						xyzImageTile: findCenterTile(resolvedBbox),
						mapImage
					},
					interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
					style: {
						type: 'tiff',
						opacity: 1.0,
						visible: true,
						visualization: {
							numBands,
							mode: numBands >= 3 ? 'multi' : 'single',
							uniformsData: {
								single: {
									index: 0,
									min: ranges[0].min,
									max: ranges[0].max,
									colorMap: 'jet'
								},
								multi: {
									r: { index: 0, min: ranges[0]?.min ?? 0, max: ranges[0]?.max ?? 255 },
									g: {
										index: Math.min(1, numBands - 1),
										min: ranges[1]?.min ?? 0,
										max: ranges[1]?.max ?? 255
									},
									b: {
										index: Math.min(2, numBands - 1),
										min: ranges[2]?.min ?? 0,
										max: ranges[2]?.max ?? 255
									}
								}
							}
						}
					}
				};

				showDataEntry = entry;
				showDialogType = null;
				showNotification('COGをタイル方式で読み込みました', 'success');
			} else {
				// 従来方式: 全体をImageSourceとして読み込む
				const tiff = await fromUrl(cogUrl);
				const fullImage = await tiff.getImage();
				const width = fullWidth;
				const height = fullHeight;

				progressText = `ラスターデータを読み込み中... (${width}x${height})`;
				const rasters = await fullImage.readRasters();
				progressText = `${numBands}バンド読み込み完了。エンコード中...`;

				const bands: RasterBands = [];
				const ranges: BandDataRange[] = [];

				for (let i = 0; i < numBands; i++) {
					const band = rasters[i] as Float32Array | Uint8Array | Uint16Array;
					bands.push(band);
					ranges.push(getMinMax(band, null));
				}

				const nodata = fullImage.getGDALNoData();
				await encodeAllBandsToTerrarium(id, bands, width, height, nodata, ranges);

				GeoTiffCache.setSize(id, width, height);
				GeoTiffCache.setNumBands(id, numBands);
				GeoTiffCache.setBbox(id, resolvedBbox);
				GeoTiffCache.markAs4326(id);
				GeoTiffCache.setRawBbox(id, bbox);

				// CogTileManager接続は不要なので解除
				CogTileManager.unregister(id);

				progressText = 'サムネイル生成中...';
				const mapImage = generateThumbnail({ bands, width, height, bbox, nodata, ranges });

				const entry: RasterImageEntry<RasterTiffStyle> = {
					id,
					type: 'raster',
					format: { type: 'image', url: '' },
					metaData: {
						...DEFAULT_CUSTOM_META_DATA,
						attribution: 'STAC/COG',
						name: entryName,
						tileSize: 256,
						bounds: resolvedBbox,
						xyzImageTile: findCenterTile(resolvedBbox),
						mapImage
					},
					interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
					style: {
						type: 'tiff',
						opacity: 1.0,
						visible: true,
						visualization: {
							numBands,
							mode: numBands >= 3 ? 'multi' : 'single',
							uniformsData: {
								single: {
									index: 0,
									min: ranges[0].min,
									max: ranges[0].max,
									colorMap: 'jet'
								},
								multi: {
									r: { index: 0, min: ranges[0]?.min ?? 0, max: ranges[0]?.max ?? 255 },
									g: {
										index: Math.min(1, numBands - 1),
										min: ranges[1]?.min ?? 0,
										max: ranges[1]?.max ?? 255
									},
									b: {
										index: Math.min(2, numBands - 1),
										min: ranges[2]?.min ?? 0,
										max: ranges[2]?.max ?? 255
									}
								}
							}
						}
					}
				};

				showDataEntry = entry;
				showDialogType = null;
				showNotification('COGを読み込みました', 'success');
			}
		} catch (e) {
			const msg =
				e instanceof TypeError && e.message.includes('Failed to fetch')
					? 'COGの読み込みに失敗しました（CORSエラー: このサーバーはブラウザからの直接アクセスを許可していません）'
					: 'COGの読み込みに失敗しました';
			showNotification(msg, 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
			progressText = '';
		}
	};

	const cancel = () => {
		showDialogType = null;
	};

	const back = () => {
		if (step === 'items' && sourceType === 'api') step = 'collection';
		else if (step === 'items' && sourceType !== 'api') step = 'browse';
		else if (step === 'collection' || step === 'browse') step = 'url';
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<div class="flex items-center gap-2">
		<span class="text-2xl font-bold">STAC</span>
		{#if statusText}
			<span class="text-sm text-gray-400">{statusText}</span>
		{/if}
	</div>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	{#if step === 'url'}
		<TextForm
			bind:value={apiUrl}
			label="URL (STAC API / catalog.json / COG .tif)"
			error={urlErrors.url}
		/>
	{/if}

	{#if step === 'collection'}
		<div class="w-full p-2">
			<label class="flex flex-col gap-1">
				<span class="text-sm text-gray-300">コレクション</span>
				<select
					bind:value={selectedCollectionId}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					{#each collections as col}
						<option value={col.id}>{col.title || col.id}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="flex w-full gap-2 p-2">
			<label class="flex min-w-0 grow flex-col gap-1">
				<span class="text-sm text-gray-300">開始日</span>
				<input
					type="date"
					bind:value={dateFrom}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				/>
			</label>
			<label class="flex min-w-0 grow flex-col gap-1">
				<span class="text-sm text-gray-300">終了日</span>
				<input
					type="date"
					bind:value={dateTo}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				/>
			</label>
		</div>

		<div class="w-full p-2 text-xs text-gray-400">検索範囲: 現在の地図表示範囲</div>
	{/if}

	{#if step === 'browse'}
		<div transition:slide class="flex w-full flex-col gap-1 p-2">
			{#each browseLinks as link}
				<button
					onclick={() => openChild(link.href)}
					disabled={$isProcessing}
					class="bg-sub hover:bg-accent w-full cursor-pointer rounded p-2 text-left text-sm text-white transition-colors"
				>
					{link.title}
				</button>
			{/each}
		</div>
	{/if}

	{#if step === 'items'}
		<div transition:slide class="w-full p-2">
			<label class="flex flex-col gap-1">
				<span class="text-sm text-gray-300">アイテム ({items.length}件)</span>
				<select
					bind:value={selectedItemIndex}
					onchange={() => updateCogAssets(selectedItemIndex)}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					{#each items as item, i}
						<option value={i}>
							{item.id}
							{item.properties.datetime ? `(${item.properties.datetime.slice(0, 10)})` : ''}
						</option>
					{/each}
				</select>
			</label>
		</div>

		{#if cogAssets.length > 0}
			<div transition:slide class="w-full p-2">
				<label class="flex flex-col gap-1">
					<span class="text-sm text-gray-300">アセット</span>
					<select
						bind:value={selectedAssetKey}
						class="bg-sub rounded border border-gray-600 p-2 text-white"
					>
						{#each cogAssets as { key, asset }}
							<option value={key}>{asset.title || key}</option>
						{/each}
					</select>
				</label>
			</div>
		{:else}
			<div transition:slide class="w-full p-2 text-sm text-yellow-400">
				COGアセットが見つかりません
			</div>
		{/if}
	{/if}

	{#if progressText}
		<div transition:slide class="w-full p-2 text-sm text-gray-300">
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
				{progressText}
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	{#if step === 'browse'}
		<button onclick={browseBack} class="c-btn-sub cursor-pointer p-4 px-6 text-lg">戻る</button>
	{:else if step !== 'url'}
		<button onclick={back} class="c-btn-sub cursor-pointer p-4 px-6 text-lg">戻る</button>
	{/if}
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	{#if step === 'url'}
		<button
			onclick={connect}
			disabled={!isUrlValid || $isProcessing}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {!isUrlValid || $isProcessing
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			接続
		</button>
	{:else if step === 'collection'}
		<button
			onclick={searchStacItems}
			disabled={!selectedCollectionId || $isProcessing}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {!selectedCollectionId ||
			$isProcessing
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			検索
		</button>
	{:else if step === 'items'}
		<button
			onclick={loadCog}
			disabled={!selectedAssetKey || $isProcessing}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {!selectedAssetKey ||
			$isProcessing
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			読み込み
		</button>
	{/if}
</div>

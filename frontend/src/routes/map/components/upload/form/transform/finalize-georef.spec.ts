import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { DEFAULT_VECTOR_LINE_STYLE } from '$routes/map/data/entries/vector/_style';
import { DEFAULT_MESH_SHADING, type MeshEntry, type MeshStyle } from '$routes/map/data/types/model';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { GeoRefVectorSourceCache } from '$routes/map/utils/cache/georef-vector-source-cache';
import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
import { encodeAllBandsToTerrarium } from '$routes/map/utils/formats/geotiff';
import { createRasterMeshEntryInWorker } from '$routes/map/utils/formats/geotiff/mesh-parallel';
import { createPointCloudSurfaceEntry } from '$routes/map/utils/formats/pointcloud/surface';
import { createVideoEntry } from '$routes/map/utils/formats/video';
import {
	warpGeoJSONByCornersParallel,
	warpPointCloudByCornersParallel
} from '$routes/map/utils/transform/georef';
import { warpGeoJSONByCorners } from '$routes/map/utils/transform/georef/warp-geojson';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGeoRefEntries } from './finalize-georef';
import type {
	GeoRefConfirmPayload,
	GeoRefPointCloudData,
	GeoRefRasterData,
	GeoRefVectorData
} from './georef-types';

const mocks = vi.hoisted(() => ({
	cached: { meshConfig: { baseValue: 0, heightScale: 1, maxGridSize: 0 } }
}));
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
vi.mock('$routes/map/utils/formats/geotiff', () => ({ encodeAllBandsToTerrarium: vi.fn() }));
vi.mock(
	'$routes/map/utils/formats/geotiff/mesh-parallel',
	() => ({ createRasterMeshEntryInWorker: vi.fn() })
);
vi.mock(
	'$routes/map/utils/formats/netcdf/cache',
	() => ({ NetCDFDataCache: { get: () => mocks.cached } })
);
vi.mock(
	'$routes/map/utils/formats/pointcloud/surface',
	() => ({ createPointCloudSurfaceEntry: vi.fn() })
);
vi.mock(
	'$routes/map/utils/formats/raster/thumbnail',
	() => ({ generateThumbnail: () => 'data:image/png;base64,test' })
);
vi.mock(
	'$routes/map/utils/transform/georef',
	() => ({ warpGeoJSONByCornersParallel: vi.fn(), warpPointCloudByCornersParallel: vi.fn() })
);
vi.mock('$routes/map/utils/formats/video', { spy: true });

const payload: GeoRefConfirmPayload = {
	bbox: [0, 0, 2, 2],
	corners: [[0, 2], [2, 2], [2, 0], [0, 0]]
};
const raster = (): GeoRefRasterData => ({
	sourceType: 'raster',
	entryId: 'test-georef',
	entryName: 'test-layer',
	parsedBands: [new Float32Array([1, 2, 3, 4])],
	parsedNodata: -1,
	dataRanges: [{ min: 1, max: 4 }],
	numBands: 1,
	imageWidth: 2,
	imageHeight: 2,
	bandMinMax: { min: 1, max: 4 },
	multiBandMinMax: { r: { min: 1, max: 4 }, g: { min: 2, max: 5 }, b: { min: 3, max: 6 } },
	imageFile: new File(['test'], 'test-image.tif'),
	registrationMode: 'raster',
	rasterConfig: { attribution: 'test-attribution', singleColorMap: 'jet' }
});
const vector = (): GeoRefVectorData => ({
	...raster(),
	sourceType: 'vector',
	sourceFeatureCollectionId: 'test-vector',
	sourceCorners: [[0, 1], [1, 1], [1, 0], [0, 0]],
	vectorAttribution: 'test-vector-attribution'
});
const source: FeatureCollection = {
	type: 'FeatureCollection',
	features: [{
		type: 'Feature',
		properties: { name: 'test-line' },
		geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }
	}]
};
const pointCloud = (): GeoRefPointCloudData => ({
	...raster(),
	sourceType: 'pointcloud',
	pointCloudConfig: {
		positions: new Float32Array([0, 0, 1, 1, 1, 2]),
		colors: new Uint8Array([0, 0, 0, 255, 255, 255]),
		pointCount: 2,
		sourceBbox: [0, 0, 1, 1]
	}
});
const mesh = (): MeshEntry<MeshStyle> => ({
	id: 'test-georef',
	type: 'model',
	format: { type: 'gltf', url: 'blob:test-mesh' },
	metaData: { ...DEFAULT_CUSTOM_META_DATA, name: 'test-mesh', bounds: payload.bbox },
	interaction: { clickable: false },
	style: {
		type: 'mesh',
		visible: true,
		opacity: 1,
		wireframe: false,
		showThroughTerrain: false,
		color: '#ffffff',
		shading: { ...DEFAULT_MESH_SHADING },
		heightColorRamp: { enabled: true, colorMap: 'jet', min: 1, max: 4 },
		transform: {
			lng: 0,
			lat: 0,
			altitude: 0,
			scale: 1,
			rotationX: 0,
			rotationY: 0,
			rotationZ: 0
		}
	}
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(encodeAllBandsToTerrarium).mockResolvedValue(undefined);
	vi.mocked(warpGeoJSONByCornersParallel).mockImplementation(async (...args) =>
		warpGeoJSONByCorners(...args)
	);
	vi.mocked(warpPointCloudByCornersParallel).mockResolvedValue(
		new Float32Array([0, 0, 1, 2, 2, 2])
	);
	vi.mocked(createRasterMeshEntryInWorker).mockResolvedValue(mesh());
	GeoRefVectorSourceCache.set('test-vector', structuredClone(source));
});
afterEach(() => {
	GeoRefVectorSourceCache.remove('test-vector');
	GeoTiffCache.clear();
	vi.restoreAllMocks();
});

describe('位置合わせ後のレイヤー生成', () => {
	it('元のベクターを変形し、変形後の範囲・出典・既定の線幅を引き継ぐ', async () => {
		const result = await createGeoRefEntries(vector(), payload);
		expect(result).toMatchObject({
			kind: 'single',
			entry: {
				type: 'vector',
				metaData: { bounds: [0, 0, 2, 2], attribution: 'test-vector-attribution' },
				style: { type: 'line', width: { expressions: [{ mapping: { value: 1 } }] } }
			}
		});
		expect(GeoRefVectorSourceCache.get('test-vector')).toEqual(source);
		expect(encodeAllBandsToTerrarium).not.toHaveBeenCalled();
	});
	it('入力形式の線幅を保持し、明示指定された線幅だけ上書きする', async () => {
		const data = vector();
		data.vectorStyle = structuredClone(DEFAULT_VECTOR_LINE_STYLE);
		const width = structuredClone(data.vectorStyle.width);
		const original = await createGeoRefEntries(data, payload);
		expect(original).toMatchObject({ entry: { style: { width } } });
		const changed = await createGeoRefEntries({ ...data, vectorLineWidth: 3 }, payload);
		expect(changed).toMatchObject({
			entry: { style: { width: { expressions: [{ mapping: { value: 3 } }] } } }
		});
	});
	it('図形グループを一括登録用の結果として返す', async () => {
		const result = await createGeoRefEntries({
			...vector(),
			vectorGroups: [{
				geometryType: 'LineString',
				name: 'test-group',
				attribution: 'test-group-attribution',
				allow3d: false
			}]
		}, payload);
		expect(result).toMatchObject({
			kind: 'group',
			entries: [{ metaData: { name: 'test-group', bounds: [0, 0, 2, 2] } }]
		});
		expect(warpGeoJSONByCornersParallel).toHaveBeenCalledOnce();
	});
	it('元ベクターが失われた場合はラスター処理へ進まず失敗する', async () => {
		GeoRefVectorSourceCache.remove('test-vector');
		await expect(createGeoRefEntries(vector(), payload)).rejects.toThrow(
			'元データが見つかりません'
		);
		expect(encodeAllBandsToTerrarium).not.toHaveBeenCalled();
	});
	it('変形後の図形が空なら登録できる結果を返さない', async () => {
		vi.mocked(warpGeoJSONByCornersParallel).mockResolvedValueOnce({
			type: 'FeatureCollection',
			features: []
		});
		await expect(createGeoRefEntries(vector(), payload)).rejects.toThrow(
			'変形後のデータが不正'
		);
	});
	it('点群の座標だけを変形し、色・点数・出典を保持する', async () => {
		const data = pointCloud();
		const result = await createGeoRefEntries(data, payload);
		expect(result).toMatchObject({
			kind: 'single',
			entry: {
				format: {
					type: 'point-cloud',
					positions: new Float32Array([0, 0, 1, 2, 2, 2]),
					colors: data.pointCloudConfig.colors,
					pointCount: 2
				},
				metaData: { bounds: payload.bbox, attribution: 'test-attribution' }
			}
		});
		expect(warpPointCloudByCornersParallel).toHaveBeenCalledWith(
			data.pointCloudConfig.positions,
			[[0, 1], [1, 1], [1, 0], [0, 0]],
			payload.corners
		);
	});
	it('点群サーフェスには変形済み座標と生成オプションを渡す', async () => {
		vi.mocked(createPointCloudSurfaceEntry).mockResolvedValueOnce({
			entry: mesh(),
			cellSize: 1,
			triangleCount: 1
		});
		const data = pointCloud();
		data.pointCloudConfig.surface = { resolution: 32, radius: 1 };
		const result = await createGeoRefEntries(data, payload);
		expect(createPointCloudSurfaceEntry).toHaveBeenCalledWith(
			'test-layer_mesh',
			expect.objectContaining({
				positions: new Float32Array([0, 0, 1, 2, 2, 2]),
				bounds: payload.bbox,
				resolution: 32,
				radius: 1
			})
		);
		expect(result).toMatchObject({ entry: { style: { type: 'mesh' } } });
	});
	it('RGBA画像は元URLと四隅を保持し、数値ラスターへ再エンコードしない', async () => {
		const result = await createGeoRefEntries({
			...raster(),
			rasterImage: { url: 'blob:test-image', attribution: 'test-image' }
		}, payload);
		expect(result).toMatchObject({
			entry: {
				id: 'test-georef',
				format: { type: 'image', url: 'blob:test-image' },
				metaData: { imageCorners: payload.corners, mapImage: 'blob:test-image' },
				style: { type: 'basemap' }
			}
		});
		expect(encodeAllBandsToTerrarium).not.toHaveBeenCalled();
	});
	it.each([1, 2, 3])(
		'%iバンドの数値ラスターを登録し、表示バンドの参照先を範囲内にする',
		async (numBands) => {
			const data = { ...raster(), numBands };
			data.parsedBands = Array.from(
				{ length: numBands },
				() => new Float32Array([1, 2, 3, 4])
			);
			const result = await createGeoRefEntries(data, payload);
			expect(result).toMatchObject({
				entry: {
					properties: { bands: { numBands } },
					style: {
						visualization: {
							mode: numBands === 1 ? 'single' : 'multi',
							uniformsData: {
								multi: {
									r: { index: 0 },
									g: { index: numBands >= 2 ? 1 : 0 },
									b: { index: numBands >= 3 ? 2 : 0 }
								}
							}
						}
					}
				}
			});
			expect(GeoTiffCache.getBbox(data.entryId)).toEqual(payload.bbox);
			expect(GeoTiffCache.getSize(data.entryId)).toEqual({ width: 2, height: 2 });
			expect(encodeAllBandsToTerrarium).toHaveBeenCalledWith(
				data.entryId,
				data.parsedBands,
				2,
				2,
				-1,
				data.dataRanges
			);
		}
	);
	it('メッシュの表示設定と時間次元を生成結果・キャッシュへ引き継ぐ', async () => {
		const dimension = { type: 'time' as const, values: ['test-time-0', 'test-time-1'] };
		const result = await createGeoRefEntries({
			...raster(),
			registrationMode: 'mesh',
			meshConfig: {
				baseValue: 2,
				heightScale: 3,
				opacity: 0.5,
				shadingEnabled: false,
				heightColorRampEnabled: false,
				temporalDimension: dimension,
				initialDimensionIndex: 1,
				attribution: 'test-mesh'
			}
		}, payload);
		expect(result).toMatchObject({
			entry: {
				metaData: { attribution: 'test-mesh' },
				style: {
					opacity: 0.5,
					shading: { enabled: false },
					heightColorRamp: { enabled: false }
				},
				properties: { temporal: { dimension } },
				state: { dimension: { currentIndex: 1 } }
			}
		});
		expect(mocks.cached.meshConfig).toEqual({ baseValue: 2, heightScale: 3, maxGridSize: 192 });
		expect(encodeAllBandsToTerrarium).not.toHaveBeenCalled();
	});
	it('動画のURLは受け渡しに成功するまで破棄可能な状態で返す', async () => {
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-video');
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		const result = await createGeoRefEntries({ ...raster(), sourceType: 'video' }, payload);
		expect(result).toMatchObject({
			entry: {
				id: 'test-georef',
				format: { type: 'video', url: 'blob:test-video' },
				metaData: { imageCorners: payload.corners }
			}
		});
		expect(revoke).not.toHaveBeenCalled();
		result.dispose?.();
		expect(revoke).toHaveBeenCalledWith('blob:test-video');
	});
	it('動画の生成が失敗したら作成済みURLを解放する', async () => {
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-video');
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		vi.mocked(createVideoEntry).mockImplementationOnce(() => {
			throw new Error('test-failure');
		});
		await expect(createGeoRefEntries({ ...raster(), sourceType: 'video' }, payload)).rejects
			.toThrow('test-failure');
		expect(revoke).toHaveBeenCalledWith('blob:test-video');
	});
	it('エンコードの失敗を呼び出し元へ返す', async () => {
		vi.mocked(encodeAllBandsToTerrarium).mockRejectedValueOnce(
			new Error('test-encode-failure')
		);
		await expect(createGeoRefEntries(raster(), payload)).rejects.toThrow('test-encode-failure');
	});
});

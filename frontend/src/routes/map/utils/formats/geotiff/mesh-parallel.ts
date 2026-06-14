import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
import { DEFAULT_MESH_SHADING } from '$routes/map/data/types/model';
import { findCenterTile } from '$routes/map/utils/map/tile';
import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import type { CreateRasterMeshEntryParams, RasterMeshGeometry } from './mesh';
import MeshWorker from './mesh.worker?worker';
import type { MeshWorkerResponse } from './mesh.worker';

const cloneArrayLike = (band: CreateRasterMeshEntryParams['band']) => {
	if (ArrayBuffer.isView(band)) {
		if (band instanceof Float32Array) return new Float32Array(band);
		if (band instanceof Float64Array) return new Float64Array(band);
		if (band instanceof Uint8Array) return new Uint8Array(band);
		if (band instanceof Uint8ClampedArray) return new Uint8ClampedArray(band);
		if (band instanceof Uint16Array) return new Uint16Array(band);
		if (band instanceof Uint32Array) return new Uint32Array(band);
		if (band instanceof Int8Array) return new Int8Array(band);
		if (band instanceof Int16Array) return new Int16Array(band);
		if (band instanceof Int32Array) return new Int32Array(band);
	}

	return Array.from(band);
};

export const createRasterMeshEntryInWorker = async (
	params: CreateRasterMeshEntryParams
): Promise<MeshEntry<MeshStyle>> => {
	const { id, name, bounds, mapImage } = params;
	// TODO: parsedBands を state で再利用しない設計に寄せられれば、この clone は不要。
	// 元ラスタはキャッシュで保持し、worker には毎回所有権を渡せる専用バッファを渡す形にしたい。
	const band = cloneArrayLike(params.band);
	const transfer = ArrayBuffer.isView(band)
		? [band.buffer]
		: undefined;
	const workerParams: Omit<CreateRasterMeshEntryParams, 'id' | 'name' | 'mapImage'> = {
		band,
		width: params.width,
		height: params.height,
		nodata: params.nodata,
		bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
		corners: params.corners
			? params.corners.map(([lng, lat]) => [lng, lat]) as CreateRasterMeshEntryParams['corners']
			: undefined,
		maxGridSize: params.maxGridSize,
		baseValue: params.baseValue,
		heightScale: params.heightScale,
		autoHeightScale: params.autoHeightScale
	};
	const { glb, center, minHeight, maxHeight } = await runSingleShotWorker<
		Omit<CreateRasterMeshEntryParams, 'id' | 'name' | 'mapImage'>,
		MeshWorkerResponse,
		RasterMeshGeometry
	>(MeshWorker, workerParams, {
		errorPrefix: 'Raster mesh worker error',
		mapResponse: (response) => (response as { result: RasterMeshGeometry; }).result,
		transfer
	});
	const url = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));

	return {
		id,
		type: 'model',
		format: {
			type: 'gltf',
			url
		},
		metaData: {
			...DEFAULT_CUSTOM_META_DATA,
			attribution: 'GeoTIFF 3D Mesh',
			name,
			bounds,
			xyzImageTile: findCenterTile(bounds),
			mapImage
		},
		interaction: { clickable: false },
		style: {
			type: 'mesh',
			visible: true,
			opacity: 1,
			wireframe: false,
			color: '#ffffff',
			shading: { ...DEFAULT_MESH_SHADING },
			heightColorRamp: {
				enabled: false,
				colorMap: 'jet',
				min: minHeight,
				max: maxHeight,
				sourceMin: minHeight,
				sourceMax: maxHeight,
				sourceSign: -1
			},
			transformOptions: {
				scale: false,
				rotation: false
			},
			transform: {
				lng: center.lng,
				lat: center.lat,
				altitude: 0,
				heightOffset: 0,
				heightScale: 1,
				scale: 1,
				rotationX: 0,
				rotationY: 0,
				rotationZ: 0
			}
		}
	};
};

import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';
import { DEFAULT_MESH_SHADING } from '$routes/map/data/types/model';
import { findCenterTile } from '$routes/map/utils/map/tile';

export type RasterMeshCornerCoordinates = [
	[number, number],
	[number, number],
	[number, number],
	[number, number]
];

interface CreateRasterMeshEntryParams {
	id: string;
	name: string;
	band: ArrayLike<number>;
	width: number;
	height: number;
	nodata: number | null;
	bounds: [number, number, number, number];
	corners?: RasterMeshCornerCoordinates;
	mapImage?: string;
	maxGridSize?: number;
}

interface RasterMeshGeometry {
	glb: ArrayBuffer;
	center: { lng: number; lat: number };
}

const DEFAULT_MAX_GRID_SIZE = 192;

const isNodataValue = (value: number, nodata: number | null) => {
	if (!Number.isFinite(value)) return true;
	if (nodata === null) return false;
	return Number.isNaN(nodata) ? Number.isNaN(value) : value === nodata;
};

const createQuadCornersFromBounds = (
	bounds: [number, number, number, number]
): RasterMeshCornerCoordinates => [
	[bounds[0], bounds[3]],
	[bounds[2], bounds[3]],
	[bounds[2], bounds[1]],
	[bounds[0], bounds[1]]
];

const interpolateOnQuad = (corners: RasterMeshCornerCoordinates, u: number, v: number) => {
	const [nw, ne, se, sw] = corners;
	const topLng = nw[0] + (ne[0] - nw[0]) * u;
	const topLat = nw[1] + (ne[1] - nw[1]) * u;
	const bottomLng = sw[0] + (se[0] - sw[0]) * u;
	const bottomLat = sw[1] + (se[1] - sw[1]) * u;

	return {
		lng: topLng + (bottomLng - topLng) * v,
		lat: topLat + (bottomLat - topLat) * v
	};
};

const exportMeshToGlb = async (mesh: THREE.Mesh): Promise<ArrayBuffer> => {
	const exporter = new GLTFExporter();

	return new Promise<ArrayBuffer>((resolve, reject) => {
		exporter.parse(
			mesh,
			(result) => {
				if (result instanceof ArrayBuffer) {
					resolve(result);
					return;
				}

				reject(new Error('GLB export did not return binary data'));
			},
			(error) => {
				reject(error instanceof Error ? error : new Error(String(error)));
			},
			{ binary: true }
		);
	});
};

const buildRasterMeshGeometry = async ({
	band,
	width,
	height,
	nodata,
	bounds,
	corners,
	maxGridSize = DEFAULT_MAX_GRID_SIZE
}: Omit<CreateRasterMeshEntryParams, 'id' | 'name' | 'mapImage'>): Promise<RasterMeshGeometry> => {
	if (width < 2 || height < 2) {
		throw new Error('3Dメッシュ化には 2x2 以上のラスタが必要です');
	}

	const quadCorners = corners ?? createQuadCornersFromBounds(bounds);
	const centerLng = (bounds[0] + bounds[2]) / 2;
	const centerLat = (bounds[1] + bounds[3]) / 2;
	const centerMerc = maplibregl.MercatorCoordinate.fromLngLat([centerLng, centerLat], 0);
	const meterUnit = centerMerc.meterInMercatorCoordinateUnits();

	const stepX = Math.max(1, Math.ceil((width - 1) / Math.max(1, maxGridSize - 1)));
	const stepY = Math.max(1, Math.ceil((height - 1) / Math.max(1, maxGridSize - 1)));

	const xIndices: number[] = [];
	const yIndices: number[] = [];

	for (let x = 0; x < width; x += stepX) {
		xIndices.push(x);
	}
	if (xIndices[xIndices.length - 1] !== width - 1) {
		xIndices.push(width - 1);
	}

	for (let y = 0; y < height; y += stepY) {
		yIndices.push(y);
	}
	if (yIndices[yIndices.length - 1] !== height - 1) {
		yIndices.push(height - 1);
	}

	const sampleWidth = xIndices.length;
	const sampleHeight = yIndices.length;
	const positions = new Float32Array(sampleWidth * sampleHeight * 3);
	const validVertices = new Uint8Array(sampleWidth * sampleHeight);
	const indices: number[] = [];

	for (let y = 0; y < sampleHeight; y++) {
		const sourceY = yIndices[y];
		const v = sampleHeight === 1 ? 0 : sourceY / (height - 1);

		for (let x = 0; x < sampleWidth; x++) {
			const sourceX = xIndices[x];
			const u = sampleWidth === 1 ? 0 : sourceX / (width - 1);
			const value = band[sourceY * width + sourceX];
			const vertexIndex = y * sampleWidth + x;
			const posIndex = vertexIndex * 3;

			if (isNodataValue(value, nodata)) {
				positions[posIndex] = 0;
				positions[posIndex + 1] = 0;
				positions[posIndex + 2] = 0;
				validVertices[vertexIndex] = 0;
				continue;
			}

			const { lng, lat } = interpolateOnQuad(quadCorners, u, v);
			const merc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);

			positions[posIndex] = (merc.x - centerMerc.x) / meterUnit;
			positions[posIndex + 1] = value;
			positions[posIndex + 2] = (merc.y - centerMerc.y) / meterUnit;
			validVertices[vertexIndex] = 1;
		}
	}

	for (let y = 0; y < sampleHeight - 1; y++) {
		for (let x = 0; x < sampleWidth - 1; x++) {
			const topLeft = y * sampleWidth + x;
			const topRight = topLeft + 1;
			const bottomLeft = (y + 1) * sampleWidth + x;
			const bottomRight = bottomLeft + 1;

			if (validVertices[topLeft] && validVertices[bottomLeft] && validVertices[topRight]) {
				indices.push(topLeft, bottomLeft, topRight);
			}

			if (validVertices[topRight] && validVertices[bottomLeft] && validVertices[bottomRight]) {
				indices.push(topRight, bottomLeft, bottomRight);
			}
		}
	}

	if (indices.length === 0) {
		throw new Error('有効な標高値が不足しているため 3D メッシュを生成できません');
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	const material = new THREE.MeshStandardMaterial({
		color: '#d9d9d9',
		roughness: 1,
		metalness: 0
	});
	const mesh = new THREE.Mesh(geometry, material);

	try {
		const glb = await exportMeshToGlb(mesh);
		return {
			glb,
			center: { lng: centerLng, lat: centerLat }
		};
	} finally {
		geometry.dispose();
		material.dispose();
	}
};

export const createRasterMeshEntry = async (
	params: CreateRasterMeshEntryParams
): Promise<ModelMeshEntry<MeshStyle>> => {
	const { id, name, bounds, mapImage } = params;
	const { glb, center } = await buildRasterMeshGeometry(params);
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
			transform: {
				lng: center.lng,
				lat: center.lat,
				altitude: 0,
				heightOffset: 0,
				scale: 1,
				rotationX: 0,
				rotationY: 0,
				rotationZ: 0
			}
		}
	};
};

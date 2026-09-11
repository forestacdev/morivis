import {
	BufferAttribute,
	BufferGeometry,
	DoubleSide,
	Group,
	Mesh,
	MeshStandardMaterial
} from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import { reconstructSurfaceChunks } from './surface-chunks';
import { localizeSurfacePoints, type SurfaceCoordinateInput } from './surface-coordinates';
import type { PointCloudSurfaceOptions } from './surface-core';
import { reconstructPointCloudSurface } from './surface-reconstruction';
import { buildTerrainSurface } from './surface-terrain';

export interface SurfaceWorkerRequest extends SurfaceCoordinateInput, PointCloudSurfaceOptions {
	colors?: Uint8Array;
}

export interface SurfaceWorkerResult {
	glb: ArrayBuffer;
	lng: number;
	lat: number;
	cellSize: number;
	triangleCount: number;
}

self.onmessage = async ({ data }: MessageEvent<SurfaceWorkerRequest>) => {
	const geometries: BufferGeometry[] = [];
	const group = new Group();
	const material = new MeshStandardMaterial({
		vertexColors: true,
		roughness: 1,
		metalness: 0,
		side: DoubleSide
	});
	try {
		const local = localizeSurfacePoints(data);
		const input = { ...data, positions: local.positions };
		const progress = (message: string) => postMessage({ progress: message });
		const surface = data.method === 'terrain'
			? buildTerrainSurface(input, progress)
			: data.method === 'buildings'
			? reconstructSurfaceChunks(input, progress)
			: (() => {
				const mesh = reconstructPointCloudSurface(input);
				return {
					chunks: [{ ...mesh, indices: undefined }],
					cellSize: mesh.cellSize,
					triangleCount: mesh.positions.length / 9
				};
			})();
		for (const chunk of surface.chunks) {
			const geometry = new BufferGeometry();
			geometries.push(geometry);
			geometry.setAttribute('position', new BufferAttribute(chunk.positions, 3));
			geometry.setAttribute('normal', new BufferAttribute(chunk.normals, 3));
			geometry.setAttribute('color', new BufferAttribute(chunk.colors, 3));
			if (chunk.indices) geometry.setIndex(new BufferAttribute(chunk.indices, 1));
			group.add(new Mesh(geometry, material));
		}
		progress('GLBを生成しています');
		const glb = await new GLTFExporter().parseAsync(group, {
			binary: true
		});
		if (!(glb instanceof ArrayBuffer)) throw new Error('GLB の生成に失敗しました');
		const result: SurfaceWorkerResult = {
			glb,
			lng: local.lng,
			lat: local.lat,
			cellSize: surface.cellSize,
			triangleCount: surface.triangleCount
		};
		(self as unknown as Worker).postMessage({ result }, [glb]);
	} catch (error) {
		postMessage({ error: error instanceof Error ? error.message : String(error) });
	} finally {
		for (const geometry of geometries) geometry.dispose();
		material.dispose();
	}
};

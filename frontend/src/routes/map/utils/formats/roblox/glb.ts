import {
	Box3,
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	Color,
	CylinderGeometry,
	Float32BufferAttribute,
	Matrix3,
	Matrix4,
	SphereGeometry,
	SRGBColorSpace,
	Vector3
} from 'three';
import type { RobloxPart, RobloxShape, RobloxWorld } from './index';
import { materialUv } from './material-uv';
import { materialForPart, type PreparedRobloxMaterial } from './pbr';
import type { RobloxImage, RobloxResources } from './resources';
import { robloxSurfaceGeometry } from './surfaces';

interface Piece {
	part: RobloxPart;
	geometry: BufferGeometry;
	color: [number, number, number];
	opacity: number;
	image?: RobloxImage;
	repeat?: boolean;
	pbr?: PreparedRobloxMaterial;
	projectColor?: boolean;
	separatePbrUv?: boolean;
	unlit?: boolean;
}

const wedgeGeometry = () => {
	const vertices = [
		[-0.5, -0.5, -0.5],
		[0.5, -0.5, -0.5],
		[-0.5, -0.5, 0.5],
		[0.5, -0.5, 0.5],
		[-0.5, 0.5, 0.5],
		[0.5, 0.5, 0.5]
	];
	const triangles = [0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 0, 2, 4, 1, 5, 3, 0, 4, 5, 0, 5, 1];
	const geometry = new BufferGeometry();
	geometry.setAttribute(
		'position',
		new Float32BufferAttribute(triangles.flatMap(index => vertices[index]), 3)
	);
	geometry.computeVertexNormals();
	return geometry;
};

const partMatrix = (part: RobloxPart) => {
	const r = part.rotation, p = part.position;
	return new Matrix4().set(
		r[0],
		r[1],
		r[2],
		p[0],
		r[3],
		r[4],
		r[5],
		p[1],
		r[6],
		r[7],
		r[8],
		p[2],
		0,
		0,
		0,
		1
	).scale(new Vector3(...part.size));
};

/** 材質ごとにまとめ、取得済み画像も埋め込んだ自己完結GLBへ変換する。 */
export const robloxWorldToGlb = (
	world: RobloxWorld,
	resources: RobloxResources = { images: new Map(), meshes: new Map() }
): ArrayBuffer => {
	const parts = world.parts;
	if (!parts.length) throw new Error('表示できる基本パーツがありません。');
	const indexed = [
		new BoxGeometry(1, 1, 1),
		new SphereGeometry(0.5, 16, 10),
		new CylinderGeometry(0.5, 0.5, 1, 16).rotateZ(-Math.PI / 2)
	];
	const geometries: Record<RobloxShape, BufferGeometry> = {
		block: indexed[0].toNonIndexed(),
		ball: indexed[1].toNonIndexed(),
		cylinder: indexed[2].toNonIndexed(),
		wedge: wedgeGeometry()
	};
	indexed.forEach(geometry => geometry.dispose());
	const extraGeometries: BufferGeometry[] = [];
	try {
		const pieces: Piece[] = [];
		const meshGeometries = new Map<string, BufferGeometry>();
		let missingMeshes = 0;
		for (const part of parts) {
			let geometry = geometries[part.shape];
			if (part.meshId) {
				const mesh = resources.meshes.get(part.meshId);
				if (!mesh) {
					missingMeshes++;
					continue;
				}
				let cached = meshGeometries.get(part.meshId);
				if (!cached) {
					const indexed = new BufferGeometry();
					indexed.setAttribute(
						'position',
						new BufferAttribute(mesh.positions.slice(), 3)
					);
					indexed.setAttribute('normal', new BufferAttribute(mesh.normals.slice(), 3));
					indexed.setAttribute('uv', new BufferAttribute(mesh.uvs, 2));
					indexed.setIndex(new BufferAttribute(mesh.indices, 1));
					indexed.computeBoundingBox();
					const size = indexed.boundingBox!.getSize(new Vector3());
					indexed.center();
					indexed.scale(
						size.x ? 1 / size.x : 1,
						size.y ? 1 / size.y : 1,
						size.z ? 1 / size.z : 1
					);
					cached = indexed.toNonIndexed();
					indexed.dispose();
					meshGeometries.set(part.meshId, cached);
					extraGeometries.push(cached);
				}
				geometry = cached;
			}
			const paintedFaces = new Set(
				part.textures?.filter(texture => texture.baked).map(texture => texture.face)
			);
			if (paintedFaces.size && !part.meshId && part.shape === 'block') {
				// BoxGeometryの面順は +X,-X,+Y,-Y,+Z,-Z。合成済みの面は下地を除く。
				const faces = [0, 3, 1, 4, 2, 5];
				const trimmed = new BufferGeometry();
				for (const name of ['position', 'normal']) {
					const attribute = geometry.getAttribute(name);
					const values: number[] = [];
					for (let i = 0; i < attribute.count; i++) {
						if (!paintedFaces.has(faces[Math.floor(i / 6)])) {
							values.push(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
						}
					}
					trimmed.setAttribute(name, new Float32BufferAttribute(values, 3));
				}
				extraGeometries.push(trimmed);
				geometry = trimmed;
			}

			const pbr = materialForPart(part, resources);
			if (geometry.getAttribute('position').count) {
				pieces.push({
					part,
					geometry,
					opacity: part.opacity,
					color: pbr.colorFactor,
					image: pbr.color,
					repeat: true,
					pbr,
					projectColor: !!part.material?.studsPerTile,
					unlit: part.material?.unlit
				});
			}
			const textures = [...(part.textures ?? [])].sort((a, b) => a.zIndex - b.zIndex);
			textures.forEach((texture, order) => {
				const image = resources.images.get(texture.asset);
				if (!image) return;
				const geometry = robloxSurfaceGeometry(part, texture, order);
				extraGeometries.push(geometry);
				pieces.push({
					part,
					geometry,
					opacity: part.opacity * texture.opacity,
					color: texture.color,
					image,
					repeat: !!texture.tile,
					pbr: texture.baked ? pbr : undefined,
					separatePbrUv: texture.baked && !!part.material?.studsPerTile,
					unlit: part.material?.unlit
				});
			});
		}
		if (missingMeshes) world.warnings.push(`読み込めないMeshPart: ${missingMeshes}件`);
		if (!pieces.length) {
			throw new Error(`表示できるパーツがありません。${world.warnings.join('、')}`);
		}
		const worldBounds = new Box3();
		const unitBounds = new Box3(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
		const images: RobloxImage[] = [];
		const imageIds = new Map<RobloxImage, number>();
		const groups = new Map<string, { pieces: Piece[]; count: number; }>();
		for (const piece of pieces) {
			worldBounds.union(unitBounds.clone().applyMatrix4(partMatrix(piece.part)));
			for (const image of [piece.image, piece.pbr?.normal, piece.pbr?.metallicRoughness]) {
				if (image && !imageIds.has(image)) {
					imageIds.set(image, images.length);
					images.push(image);
				}
			}
			const key = JSON.stringify([
				piece.opacity,
				[piece.image, piece.pbr?.normal, piece.pbr?.metallicRoughness].map(image =>
					image ? imageIds.get(image) : -1
				),
				!!piece.repeat,
				!!piece.separatePbrUv,
				piece.pbr?.metallic ?? 0,
				piece.pbr?.roughness ?? 1,
				piece.pbr?.transparent ?? piece.image?.mimeType === 'image/png',
				!!piece.unlit
			]);
			const group = groups.get(key) ?? { pieces: [], count: 0 };
			group.pieces.push(piece);
			group.count += piece.geometry.getAttribute('position').count;
			groups.set(key, group);
		}
		// 地理座標を持たないため、中心・底面をローカル原点へ寄せて位置合わせに渡す。
		const origin = worldBounds.getCenter(new Vector3());
		origin.y = worldBounds.min.y;
		const arrays: Uint8Array<ArrayBuffer>[] = [];
		const bufferViews: {
			buffer: number;
			byteOffset: number;
			byteLength: number;
			target?: number;
		}[] = [];
		const accessors: {
			bufferView: number;
			componentType: number;
			count: number;
			type: string;
			min?: number[];
			max?: number[];
		}[] = [];
		const primitives: {
			attributes: Record<string, number>;
			material: number;
			mode: number;
		}[] = [];
		const materials: {
			pbrMetallicRoughness: {
				baseColorFactor: number[];
				baseColorTexture?: { index: number; };
				metallicRoughnessTexture?: { index: number; texCoord: number; };
				metallicFactor: number;
				roughnessFactor: number;
			};
			alphaMode: string;
			normalTexture?: { index: number; texCoord: number; };
			extensions?: { KHR_materials_unlit: Record<string, never>; };
		}[] = [];
		let binarySize = 0;
		const append = (bytes: Uint8Array<ArrayBuffer>, target?: number) => {
			const index = bufferViews.length;
			arrays.push(bytes);
			bufferViews.push({
				buffer: 0,
				byteOffset: binarySize,
				byteLength: bytes.length,
				target
			});
			binarySize += Math.ceil(bytes.length / 4) * 4;
			return index;
		};
		const accessor = (array: Float32Array<ArrayBuffer>, bounds?: Box3, itemSize = 3) => {
			const index = accessors.length;
			accessors.push({
				bufferView: append(new Uint8Array(array.buffer), 34962),
				componentType: 5126,
				count: array.length / itemSize,
				type: `VEC${itemSize}`,
				...(bounds ? { min: bounds.min.toArray(), max: bounds.max.toArray() } : {})
			});
			return index;
		};
		const textures: { source: number; sampler: number; }[] = [];
		const textureIds = new Map<string, number>();
		for (const group of groups.values()) {
			const { opacity, image, repeat, pbr, separatePbrUv, unlit } = group.pieces[0];
			const positions = new Float32Array(group.count * 3);
			const normals = new Float32Array(group.count * 3);
			const colors = new Float32Array(group.count * 3);
			const uvs = image || pbr?.normal || pbr?.metallicRoughness
				? new Float32Array(group.count * 2)
				: undefined;
			const pbrUvs = separatePbrUv && (pbr?.normal || pbr?.metallicRoughness)
				? new Float32Array(group.count * 2)
				: undefined;
			const bounds = new Box3();
			let offset = 0;
			for (const piece of group.pieces) {
				const { part, geometry } = piece;
				const source = geometry.getAttribute('position'),
					normal = geometry.getAttribute('normal');
				const matrix = partMatrix(part);
				matrix.setPosition(new Vector3(...part.position).sub(origin));
				const normalMatrix = new Matrix3().getNormalMatrix(matrix);
				const color = new Color().setRGB(...piece.color, SRGBColorSpace);
				const point = new Vector3(), direction = new Vector3();
				for (let i = 0; i < source.count; i++) {
					point.fromBufferAttribute(source, i).applyMatrix4(matrix);
					point.toArray(positions, offset);
					// accessorの範囲を実際に書き出したfloat32の値に合わせる。
					bounds.expandByPoint(point.fromArray(positions, offset));
					direction.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize()
						.toArray(normals, offset);
					color.toArray(colors, offset);
					if (uvs) {
						const uv = geometry.getAttribute('uv');
						const projected = part.material?.studsPerTile
							? materialUv(
								[source.getX(i), source.getY(i), source.getZ(i)],
								[normal.getX(i), normal.getY(i), normal.getZ(i)],
								part.size,
								part.material.studsPerTile
							)
							: undefined;
						const baseUv = piece.projectColor && projected
							? projected
							: [uv?.getX(i) ?? 0, uv?.getY(i) ?? 0];
						uvs.set(baseUv, offset / 3 * 2);
						if (pbrUvs) pbrUvs.set(projected ?? baseUv, offset / 3 * 2);
					}
					offset += 3;
				}
			}
			primitives.push({
				attributes: {
					POSITION: accessor(positions, bounds),
					NORMAL: accessor(normals),
					COLOR_0: accessor(colors),
					...(uvs ? { TEXCOORD_0: accessor(uvs, undefined, 2) } : {}),
					...(pbrUvs ? { TEXCOORD_1: accessor(pbrUvs, undefined, 2) } : {})
				},
				material: materials.length,
				mode: 4
			});
			const textureIndex = (image: RobloxImage, repeat: boolean) => {
				const source = imageIds.get(image)!;
				const key = `${source}:${repeat}`;
				let index = textureIds.get(key);
				if (index === undefined) {
					index = textures.length;
					textures.push({ source, sampler: repeat ? 1 : 0 });
					textureIds.set(key, index);
				}
				return index;
			};
			const texCoord = pbrUvs ? 1 : 0;
			materials.push({
				pbrMetallicRoughness: {
					baseColorFactor: [1, 1, 1, opacity],
					...(image
						? { baseColorTexture: { index: textureIndex(image, !!repeat) } }
						: {}),
					...(pbr?.metallicRoughness
						? {
							metallicRoughnessTexture: {
								index: textureIndex(pbr.metallicRoughness, true),
								texCoord
							}
						}
						: {}),
					metallicFactor: pbr?.metallic ?? 0,
					roughnessFactor: pbr?.roughness ?? 1
				},
				...(pbr?.normal
					? { normalTexture: { index: textureIndex(pbr.normal, true), texCoord } }
					: {}),
				alphaMode: opacity < 1 || (pbr?.transparent ?? image?.mimeType === 'image/png')
					? 'BLEND'
					: 'OPAQUE',
				...(unlit ? { extensions: { KHR_materials_unlit: {} } } : {})
			});
		}
		const gltfImages = images.map(image => ({
			bufferView: append(image.bytes),
			mimeType: image.mimeType
		}));
		const json = new TextEncoder().encode(JSON.stringify({
			asset: { version: '2.0', generator: 'morivis-roblox' },
			...(pieces.some(piece => piece.unlit)
				? { extensionsUsed: ['KHR_materials_unlit'] }
				: {}),
			scene: 0,
			scenes: [{ nodes: [0] }],
			// Y軸まわりに180度回し、Robloxの前方(-Z)を地図上の南へ向ける。
			nodes: [{ mesh: 0, rotation: [0, 1, 0, 0] }],
			meshes: [{ primitives }],
			buffers: [{ byteLength: binarySize }],
			bufferViews,
			accessors,
			materials,
			...(images.length
				? {
					images: gltfImages,
					textures,
					samplers: [33071, 10497].map(wrap => ({
						wrapS: wrap,
						wrapT: wrap,
						magFilter: 9729,
						minFilter: 9987
					}))
				}
				: {})
		}));
		const jsonSize = Math.ceil(json.length / 4) * 4;
		const result = new ArrayBuffer(12 + 8 + jsonSize + 8 + binarySize);
		const view = new DataView(result), bytes = new Uint8Array(result);
		view.setUint32(0, 0x46546c67, true);
		view.setUint32(4, 2, true);
		view.setUint32(8, result.byteLength, true);
		view.setUint32(12, jsonSize, true);
		view.setUint32(16, 0x4e4f534a, true);
		bytes.fill(32, 20, 20 + jsonSize);
		bytes.set(json, 20);
		view.setUint32(20 + jsonSize, binarySize, true);
		view.setUint32(24 + jsonSize, 0x004e4942, true);
		for (let i = 0; i < arrays.length; i++) {
			bytes.set(arrays[i], 28 + jsonSize + bufferViews[i].byteOffset);
		}
		return result;
	} finally {
		[...Object.values(geometries), ...extraGeometries].forEach(geometry => geometry.dispose());
	}
};

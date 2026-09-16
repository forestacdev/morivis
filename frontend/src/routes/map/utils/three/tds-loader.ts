import { Float32BufferAttribute, Group, Matrix4, Mesh, Vector3 } from 'three';
import { TDSLoader as ThreeTDSLoader } from 'three/addons/loaders/TDSLoader.js';

interface Chunk {
	id: number;
	start: number;
	end: number;
}

/** Three.jsが未対応のKFDATAから、静的モデルの初期配置を復元する。 */
export class TDSLoader extends ThreeTDSLoader {
	override parse = (buffer: ArrayBuffer, path: string): Group => {
		const view = new DataView(buffer);
		const requireBytes = (start: number, length: number, end: number) => {
			if (start < 0 || start + length > end || end > view.byteLength) {
				throw new Error('3DSの配置情報が破損しています');
			}
		};
		const chunks = (start: number, end: number): Chunk[] => {
			const result: Chunk[] = [];
			for (let offset = start; offset < end;) {
				requireBytes(offset, 6, end);
				const length = view.getUint32(offset + 2, true);
				if (length < 6) throw new Error('3DSのチャンク長が不正です');
				requireBytes(offset, length, end);
				result.push({
					id: view.getUint16(offset, true),
					start: offset + 6,
					end: offset + length
				});
				offset += length;
			}
			return result;
		};
		const string = (start: number, end: number) => {
			let offset = start;
			let value = '';
			while (offset < end) {
				const byte = view.getUint8(offset++);
				if (byte === 0) return { value, next: offset };
				value += String.fromCharCode(byte);
			}
			throw new Error('3DSの文字列が終端されていません');
		};
		const floats = (start: number, count: number, end: number) => {
			requireBytes(start, count * 4, end);
			return Array.from({ length: count }, (_, index) => {
				const value = view.getFloat32(start + index * 4, true);
				if (!Number.isFinite(value)) throw new Error('3DSの座標が不正です');
				return value;
			});
		};
		// CADの初期姿勢を使う。複数キーのアニメーション再生は対象外。
		const firstKey = (chunk: Chunk, count: number) => {
			requireBytes(chunk.start, 14, chunk.end);
			if (view.getUint32(chunk.start + 10, true) === 0) return undefined;
			requireBytes(chunk.start + 14, 6, chunk.end);
			const flags = view.getUint16(chunk.start + 18, true);
			let offset = chunk.start + 20;
			for (let bit = 0; bit < 5; bit++) {
				if (flags & (1 << bit)) offset += 4; // tension / continuity / bias / ease
			}
			return floats(offset, count, chunk.end);
		};

		requireBytes(0, 6, view.byteLength);
		const main = chunks(6, view.getUint32(2, true));
		const keyframes = main.find(({ id }) => id === 0xb000);
		if (!keyframes) return super.parse(buffer, path);
		const nodes = chunks(keyframes.start, keyframes.end)
			.filter(({ id }) => id === 0xb002)
			.map((chunk, index) => {
				const node = {
					id: index,
					parent: -1,
					meshName: '',
					pivot: new Vector3(),
					object: new Group()
				};
				for (const item of chunks(chunk.start, chunk.end)) {
					if (item.id === 0xb030) {
						requireBytes(item.start, 2, item.end);
						node.id = view.getUint16(item.start, true);
					} else if (item.id === 0xb010) {
						const name = string(item.start, item.end);
						requireBytes(name.next, 6, item.end);
						node.meshName = name.value;
						node.parent = view.getInt16(name.next + 4, true);
					} else if (item.id === 0xb011) {
						node.object.name = string(item.start, item.end).value;
					} else if (item.id === 0xb013) {
						node.pivot.fromArray(floats(item.start, 3, item.end));
					} else if (item.id === 0xb020 || item.id === 0xb022) {
						const values = firstKey(item, 3);
						if (values) {
							(item.id === 0xb020 ? node.object.position : node.object.scale)
								.fromArray(values);
						}
					} else if (item.id === 0xb021) {
						const values = firstKey(item, 4);
						if (values) {
							const axis = new Vector3(values[1], values[2], values[3]);
							if (axis.lengthSq() > 0) {
								// 3DSの回転角はThree.jsと逆向き。
								node.object.quaternion.setFromAxisAngle(
									axis.normalize(),
									-values[0]
								);
							}
						}
					}
				}
				node.object.name ||= node.meshName;
				return node;
			});
		if (!nodes.length) return super.parse(buffer, path);
		const byId = new Map(nodes.map((node) => [node.id, node]));
		if (byId.size !== nodes.length) throw new Error('3DSのノードIDが重複しています');
		for (const node of nodes) {
			const visited = new Set<number>([node.id]);
			let parent = node.parent;
			while (parent !== -1) {
				if (visited.has(parent) || visited.size > 512 || !byId.has(parent)) {
					throw new Error('3DSの親子関係が不正です');
				}
				visited.add(parent);
				parent = byId.get(parent)!.parent;
			}
		}

		// TDSLoaderのMESH_MATRIX補正を経由せず、元の頂点を正しいローカル座標へ戻す。
		const meshData = new Map<string, { positions: number[]; matrix: Matrix4; }>();
		const data = main.find(({ id }) => id === 0x3d3d);
		if (data) {
			for (const item of chunks(data.start, data.end).filter(({ id }) => id === 0x4000)) {
				const name = string(item.start, item.end);
				const mesh = chunks(name.next, item.end).find(({ id }) => id === 0x4100);
				if (!mesh) continue;
				let positions: number[] = [];
				const matrix = new Matrix4();
				for (const part of chunks(mesh.start, mesh.end)) {
					if (part.id === 0x4110) {
						requireBytes(part.start, 2, part.end);
						positions = floats(
							part.start + 2,
							view.getUint16(part.start, true) * 3,
							part.end
						);
					} else if (part.id === 0x4160) {
						const v = floats(part.start, 12, part.end);
						matrix.set(
							v[0],
							v[3],
							v[6],
							v[9],
							v[1],
							v[4],
							v[7],
							v[10],
							v[2],
							v[5],
							v[8],
							v[11],
							0,
							0,
							0,
							1
						);
					}
				}
				if (matrix.determinant() === 0) throw new Error('3DSの変換行列が不正です');
				meshData.set(name.value, { positions, matrix });
			}
		}

		const root = super.parse(buffer, path);
		const meshes = new Map(
			root.children.filter((child): child is Mesh => child instanceof Mesh)
				.map((mesh) => [mesh.name, mesh])
		);
		const used = new Set<string>();
		for (const node of nodes) {
			const template = meshes.get(node.meshName);
			if (template) {
				if (!used.has(node.meshName)) {
					const source = meshData.get(node.meshName);
					if (!source) throw new Error('3DSのメッシュが見つかりません');
					template.geometry.setAttribute(
						'position',
						new Float32BufferAttribute(source.positions, 3)
					);
					template.geometry.applyMatrix4(source.matrix.clone().invert());
					template.geometry.computeVertexNormals();
					template.removeFromParent();
					used.add(node.meshName);
				}
				// インスタンス間でgeometry/materialを共有し、pivotだけを個別に適用する。
				const instance = template.clone();
				instance.position.copy(node.pivot).negate();
				instance.quaternion.identity();
				instance.scale.setScalar(1);
				node.object.add(instance);
			}
			(byId.get(node.parent)?.object ?? root).add(node.object);
		}
		root.updateMatrixWorld(true);
		return root;
	};
}

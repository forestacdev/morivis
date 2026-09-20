import type { McaMesh } from '../mesh';
import type { ResourceMaterial, ResourceTexture } from './types';

const PAGE_SIZE = 2048;
const PADDING = 2;
type MeshGroup = NonNullable<McaMesh['groups']>[number];
interface Tile {
	texture: ResourceTexture;
	minU: number;
	minV: number;
	maxU: number;
	maxV: number;
	width: number;
	height: number;
}
interface Slot {
	tile: Tile;
	x: number;
	y: number;
	width: number;
	height: number;
}
interface Page {
	slots: Slot[];
	width: number;
	height: number;
}
interface Placement {
	slot: Slot;
	texture: ResourceTexture;
}

const bitmapFor = (texture: ResourceTexture) =>
	createImageBitmap(new Blob([texture.png], { type: 'image/png' }));
const materialKey = (material: ResourceMaterial) =>
	`${material.key}/${material.alphaMode}/${material.opacity ?? 1}`;

/** 全チャンクの使用範囲を集計し、0..1を超えるUVも繰り返し模様のまま収める。 */
const collectTiles = async (meshes: McaMesh[]): Promise<Tile[]> => {
	const tiles = new Map<string, Tile>();
	for (const mesh of meshes) {
		if (!mesh.uvs) continue;
		for (const group of mesh.groups ?? []) {
			const texture = group.material.texture;
			if (!texture || texture.atlas) continue;
			let tile = tiles.get(texture.name);
			if (!tile) {
				tile = { texture, minU: 0, minV: 0, maxU: 1, maxV: 1, width: 0, height: 0 };
				tiles.set(texture.name, tile);
			}
			for (let i = group.start; i < group.start + group.count; i++) {
				const index = mesh.indices[i] * 2;
				const u = mesh.uvs[index], v = mesh.uvs[index + 1];
				if (!Number.isFinite(u) || !Number.isFinite(v)) {
					throw new Error('テクスチャのUVが不正です');
				}
				tile.minU = Math.min(tile.minU, Math.floor(u));
				tile.minV = Math.min(tile.minV, Math.floor(v));
				tile.maxU = Math.max(tile.maxU, Math.ceil(u));
				tile.maxV = Math.max(tile.maxV, Math.ceil(v));
			}
		}
	}
	for (const tile of tiles.values()) {
		if (tile.texture.width && tile.texture.height) {
			tile.width = tile.texture.width;
			tile.height = tile.texture.height;
		} else {
			const bitmap = await bitmapFor(tile.texture);
			try {
				tile.width = bitmap.width;
				tile.height = bitmap.height;
			} finally {
				bitmap.close();
			}
		}
		if (![tile.width, tile.height].every(value => Number.isSafeInteger(value) && value > 0)) {
			throw new Error(`テクスチャの寸法が不正です: ${tile.texture.name}`);
		}
	}
	return [...tiles.values()];
};

const packTiles = (tiles: Tile[]): Page[] => {
	const candidates = tiles.map(tile => ({
		tile,
		x: 0,
		y: 0,
		width: (tile.maxU - tile.minU) * tile.width + PADDING * 2,
		height: (tile.maxV - tile.minV) * tile.height + PADDING * 2
	})).filter(slot => slot.width <= PAGE_SIZE && slot.height <= PAGE_SIZE)
		.sort((a, b) =>
			b.height - a.height || b.width - a.width
			|| a.tile.texture.name.localeCompare(b.tile.texture.name)
		);
	const pages: Page[] = [];
	let page: Page = { slots: [], width: 0, height: 0 };
	let x = 0, y = 0, rowHeight = 0;
	for (const slot of candidates) {
		if (x + slot.width > PAGE_SIZE) {
			x = 0;
			y += rowHeight;
			rowHeight = 0;
		}
		if (y + slot.height > PAGE_SIZE) {
			pages.push(page);
			page = { slots: [], width: 0, height: 0 };
			x = 0;
			y = 0;
			rowHeight = 0;
		}
		slot.x = x;
		slot.y = y;
		page.slots.push(slot);
		page.width = Math.max(page.width, x + slot.width);
		page.height = Math.max(page.height, y + slot.height);
		x += slot.width;
		rowHeight = Math.max(rowHeight, slot.height);
	}
	if (page.slots.length) pages.push(page);
	return pages;
};

const drawPage = async (page: Page, index: number): Promise<ResourceTexture> => {
	const canvas = new OffscreenCanvas(page.width, page.height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('テクスチャアトラスを作成できません');
	context.imageSmoothingEnabled = false;
	try {
		for (const slot of page.slots) {
			const bitmap = await bitmapFor(slot.tile.texture);
			try {
				if (bitmap.width !== slot.tile.width || bitmap.height !== slot.tile.height) {
					throw new Error(`テクスチャの寸法が一致しません: ${slot.tile.texture.name}`);
				}
				const pattern = context.createPattern(bitmap, 'repeat');
				if (!pattern) {
					throw new Error(`テクスチャを配置できません: ${slot.tile.texture.name}`);
				}
				context.save();
				context.translate(slot.x + PADDING, slot.y + PADDING);
				context.fillStyle = pattern;
				// 余白にも繰り返し画像を描き、端のサンプリングで隣の画像を拾わせない。
				context.fillRect(-PADDING, -PADDING, slot.width, slot.height);
				context.restore();
			} finally {
				bitmap.close();
			}
		}
		const png = await canvas.convertToBlob({ type: 'image/png' });
		return {
			name: `morivis:atlas/${index}`,
			png: new Uint8Array(await png.arrayBuffer()),
			alphaMode: 'BLEND',
			width: page.width,
			height: page.height,
			atlas: true
		};
	} finally {
		canvas.width = 0;
		canvas.height = 0;
	}
};

const remapMesh = (mesh: McaMesh, placements: Map<string, Placement>) => {
	if (!mesh.uvs || !mesh.groups) return;
	// MCAの頂点は面ごとに独立している。同じ面の2三角形では一度だけUVを変換する。
	const visited = new Uint8Array(mesh.uvs.length / 2);
	const merged = new Map<
		string,
		{ material: ResourceMaterial; groups: MeshGroup[]; count: number; }
	>();
	for (const group of mesh.groups) {
		const original = group.material;
		const placement = original.texture && placements.get(original.texture.name);
		const material = placement
			? { ...original, key: placement.texture.name, texture: placement.texture }
			: original;
		if (placement) {
			const { slot, texture } = placement;
			for (let i = group.start; i < group.start + group.count; i++) {
				const vertex = mesh.indices[i];
				if (visited[vertex]) continue;
				visited[vertex] = 1;
				mesh.uvs[vertex * 2] =
					(slot.x + PADDING + (mesh.uvs[vertex * 2] - slot.tile.minU) * slot.tile.width)
					/ texture.width!;
				mesh.uvs[vertex * 2 + 1] = (slot.y + PADDING
					+ (mesh.uvs[vertex * 2 + 1] - slot.tile.minV) * slot.tile.height)
					/ texture.height!;
			}
		}
		const key = materialKey(material);
		let target = merged.get(key);
		if (!target) {
			target = { material, groups: [], count: 0 };
			merged.set(key, target);
		}
		target.groups.push(group);
		target.count += group.count;
	}
	const indices = new Uint32Array(mesh.indices.length);
	let offset = 0;
	mesh.groups = [...merged.values()].map(target => {
		const start = offset;
		for (const group of target.groups) {
			indices.set(mesh.indices.subarray(group.start, group.start + group.count), offset);
			offset += group.count;
		}
		return { start, count: target.count, material: target.material };
	});
	mesh.indices = indices;
};

/** 変換用メッシュのUV・indices・材質を更新。座標、法線、頂点色、チャンク分割は保持する。 */
export const atlasMcaMeshes = async (meshes: McaMesh[]): Promise<void> => {
	const pages = packTiles(await collectTiles(meshes));
	if (!pages.length) return;
	const placements = new Map<string, Placement>();
	for (const [index, page] of pages.entries()) {
		const texture = await drawPage(page, index);
		for (const slot of page.slots) placements.set(slot.tile.texture.name, { slot, texture });
	}
	for (const mesh of meshes) remapMesh(mesh, placements);
};

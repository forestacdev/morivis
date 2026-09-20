import type { McaRegionPosition } from './types';
import { isMcaRegionPositionValid, parseMcaRegionFileName } from './world-placement';

const regionKey = ({ x, z }: McaRegionPosition) => `${x},${z}`;

/** 除外はファイル単位で保持し、新規追加・差し替えファイルは最初から選択する。 */
export const getSelectedMcaUploadFiles = <T extends Pick<File, 'name'>>(
	files: T[],
	excludedFiles: readonly T[]
): T[] => {
	const excluded = new Set(excludedFiles);
	return files.filter(file => !excluded.has(file));
};

export const toggleMcaUploadRegion = <T extends Pick<File, 'name'>>(
	files: T[],
	excludedFiles: readonly T[],
	region: McaRegionPosition
): T[] => {
	const targets = files.filter(file => {
		const position = parseMcaRegionFileName(file.name);
		return position && regionKey(position) === regionKey(region);
	});
	const excluded = new Set(excludedFiles.filter(file => files.includes(file)));
	const selected = targets.some(file => !excluded.has(file));
	for (const file of targets) {
		if (selected) excluded.add(file);
		else excluded.delete(file);
	}
	return [...excluded];
};

/** 追加ドロップ・ファイル選択共通。同じ区画は最新のファイルに置き換える。 */
export const mergeMcaUploadFiles = (current: File[], incoming: File[]): File[] => {
	const regions = incoming.map(file => {
		const region = parseMcaRegionFileName(file.name);
		if (!region) throw new Error(`${file.name}: 元のファイル名 r.x.z.mca を使用してください`);
		return region;
	});
	const files = new Map<string, File>();
	for (const file of current) {
		const region = parseMcaRegionFileName(file.name);
		files.set(region ? regionKey(region) : `invalid:${file.name}`, file);
	}
	incoming.forEach((file, index) => files.set(regionKey(regions[index]), file));
	return [...files.values()];
};

export interface McaUploadGridCell extends McaRegionPosition {
	name: string;
	files: string[];
	loaded: boolean;
	selected: boolean;
}

/** 指定した表示範囲のみ生成する。アニメーション時は周辺セルを含められる。 */
export const createMcaUploadGrid = (
	files: Pick<File, 'name'>[],
	center?: McaRegionPosition,
	options: { columns?: number; rows?: number; excludedFiles?: readonly Pick<File, 'name'>[]; } =
		{}
) => {
	const { columns = 9, rows = 7, excludedFiles = [] } = options;
	if (![columns, rows].every(value => Number.isSafeInteger(value) && value > 0)) {
		throw new Error('グリッドの行列数は1以上の整数で指定してください');
	}
	const regions = new Map<string, { position: McaRegionPosition; files: string[]; }>();
	const selectedRegions = new Set(
		getSelectedMcaUploadFiles(files, excludedFiles)
			.map(file => parseMcaRegionFileName(file.name))
			.filter((position): position is McaRegionPosition => position !== null)
			.map(regionKey)
	);
	for (const file of files) {
		const position = parseMcaRegionFileName(file.name);
		if (!position) continue;
		const key = regionKey(position);
		const existing = regions.get(key);
		if (existing) existing.files.push(file.name);
		else regions.set(key, { position, files: [file.name] });
	}
	let gridCenter = center && isMcaRegionPositionValid(center) ? { ...center } : undefined;
	if (!gridCenter) {
		let minX = Infinity;
		let minZ = Infinity;
		let maxX = -Infinity;
		let maxZ = -Infinity;
		for (const { position } of regions.values()) {
			minX = Math.min(minX, position.x);
			minZ = Math.min(minZ, position.z);
			maxX = Math.max(maxX, position.x);
			maxZ = Math.max(maxZ, position.z);
		}
		gridCenter = regions.size && maxX - minX < columns && maxZ - minZ < rows
			? { x: Math.floor((minX + maxX) / 2), z: Math.floor((minZ + maxZ) / 2) }
			: { ...(regions.values().next().value?.position ?? { x: 0, z: 0 }) };
	}
	const cells: McaUploadGridCell[] = [];
	// X=0/Z=0はr.0.0の北西角。セル中心ではなく境界の交点を示す。
	const originColumn = Math.floor(columns / 2) - gridCenter.x;
	const originRow = Math.floor(rows / 2) - gridCenter.z;
	const origin = originColumn >= 0 && originColumn <= columns
			&& originRow >= 0 && originRow <= rows
		? { column: originColumn, row: originRow }
		: null;
	let visibleRegions = 0;
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const x = gridCenter.x + column - Math.floor(columns / 2);
			const z = gridCenter.z + row - Math.floor(rows / 2);
			const names = regions.get(regionKey({ x, z }))?.files ?? [];
			if (names.length) visibleRegions++;
			cells.push({
				x,
				z,
				name: `r.${x}.${z}.mca`,
				files: names,
				loaded: names.length > 0,
				selected: selectedRegions.has(regionKey({ x, z }))
			});
		}
	}
	return {
		columns,
		rows,
		center: gridCenter,
		origin,
		cells,
		regionCount: regions.size,
		selectedCount: selectedRegions.size,
		outsideCount: regions.size - visibleRegions
	};
};

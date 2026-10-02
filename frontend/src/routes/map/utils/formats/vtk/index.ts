import { parseLegacyVtk } from './legacy';
import { checkVtkFileSize, createArrayBudget } from './numeric';
import { extractVtkSurface } from './surface';
import type { VtkData, VtkSummary, VtkSurface } from './types';
import { parseXmlVtk } from './xml';

export const parseVtk = (buffer: ArrayBuffer): VtkData => {
	checkVtkFileSize(buffer.byteLength);
	const bytes = new Uint8Array(buffer);
	const prefix = new TextDecoder().decode(bytes.subarray(0, 256)).trimStart();
	const budget = createArrayBudget();
	return prefix.startsWith('<') ? parseXmlVtk(bytes, budget) : parseLegacyVtk(bytes, budget);
};

export const summarizeVtk = (
	data: VtkData,
	surface: VtkSurface = extractVtkSurface(data)
): VtkSummary => ({
	pointCount: data.points.length / 3,
	cellCount: data.cells.length,
	triangleCount: surface.cellIndices.length,
	ignoredCellCount: surface.ignoredCellCount,
	scalars: data.scalars.flatMap((scalar, index) => {
		let min = Infinity;
		let max = -Infinity;
		for (const value of scalar.values) {
			if (Number.isFinite(value)) {
				min = Math.min(min, value);
				max = Math.max(max, value);
			}
		}
		return Number.isFinite(min)
			? [{ id: String(index), name: scalar.name, association: scalar.association, min, max }]
			: [];
	})
});

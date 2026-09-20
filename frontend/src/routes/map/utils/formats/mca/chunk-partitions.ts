import { type McaRegion, type McaSection, sectionKey } from './types';

export interface McaChunkPartition {
	region: McaRegion;
	ownedSections: Set<string>;
}

/** 最大32件の小さな仕事に分ける。隣接sectionは参照専用に含める。 */
export const partitionMcaChunks = (region: McaRegion): McaChunkPartition[] => {
	const chunks = new Map<string, McaSection[]>();
	for (const section of region.sections.values()) {
		const key = `${section.x},${section.z}`;
		const list = chunks.get(key) ?? [];
		list.push(section);
		chunks.set(key, list);
	}
	const ordered = [...chunks.values()].sort((a, b) => a[0].z - b[0].z || a[0].x - b[0].x);
	const chunksPerTask = Math.max(1, Math.ceil(ordered.length / 32));
	const partitions: McaChunkPartition[] = [];
	for (let cursor = 0; cursor < ordered.length; cursor += chunksPerTask) {
		const ownedSections = new Set<string>();
		const sections = new Map<string, McaSection>();
		for (const chunk of ordered.slice(cursor, cursor + chunksPerTask)) {
			for (const section of chunk) {
				const key = sectionKey(section.x, section.y, section.z);
				ownedSections.add(key);
				sections.set(key, section);
			}
		}
		for (const key of ownedSections) {
			const section = sections.get(key)!;
			for (
				const [dx, dy, dz] of [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [
					0,
					0,
					1
				]]
			) {
				const neighborKey = sectionKey(section.x + dx, section.y + dy, section.z + dz);
				const neighbor = region.sections.get(neighborKey);
				if (neighbor) sections.set(neighborKey, neighbor);
			}
		}
		partitions.push({ region: { ...region, sections }, ownedSections });
	}
	return partitions;
};

export interface McaOptions {
	minChunkX?: number;
	maxChunkX?: number;
	minChunkZ?: number;
	maxChunkZ?: number;
}

export interface McaProgress {
	stage: 'read' | 'mesh';
	completed: number;
	total: number;
}

export interface McaResult {
	glb: ArrayBuffer;
	chunkCount: number;
	blockCount: number;
	faceCount: number;
	dataVersions: number[];
}

export interface McaSection {
	x: number;
	y: number;
	z: number;
	/** 共通パレットのID。単一ブロックのsectionは配列を確保しない。 */
	blocks: number | Uint16Array;
}

export interface McaRegion {
	sections: Map<string, McaSection>;
	palette: string[];
	chunkCount: number;
	blockCount: number;
	dataVersions: number[];
}

export const sectionKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

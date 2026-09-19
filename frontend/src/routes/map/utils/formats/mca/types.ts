export interface McaRegionPosition {
	x: number;
	z: number;
}

export interface McaOptions {
	/** 単体・複数とも読み込み全体の結合後の面数上限。0は制限なし。 */
	maxFaces?: number;
	/** 配置済みのリソースパック。Worker入口で設定する。 */
	resourcePackUrl?: string;
	/** ファイル名由来のリージョン座標。指定時はワールド原点をGLB内に保持する。 */
	region?: McaRegionPosition;
	minChunkX?: number;
	maxChunkX?: number;
	minChunkZ?: number;
	maxChunkZ?: number;
}

export interface McaProgress {
	fileName?: string;
	fileIndex?: number;
	fileCount?: number;
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
	/** モデルのvariants/multipartを選ぶためのブロック状態。 */
	states?: Record<string, string>[];
	/** パレットIDごとの形状。省略時は従来の立方体。 */
	shapes?: ('cube' | 'slab-bottom' | 'slab-top')[];
	chunkCount: number;
	blockCount: number;
	dataVersions: number[];
}

export const sectionKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

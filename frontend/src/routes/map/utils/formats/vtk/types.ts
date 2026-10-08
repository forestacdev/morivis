export interface VtkScalarSummary {
	id: string;
	name: string;
	association: 'point' | 'cell';
	min: number;
	max: number;
}

export interface VtkSummary {
	pointCount: number;
	cellCount: number;
	triangleCount: number;
	ignoredCellCount: number;
	scalars: VtkScalarSummary[];
}

export interface VtkRenderOptions {
	scalarId: string | null;
	upAxis: 'z' | 'y';
	unitScale: number;
}

export interface VtkScalar {
	name: string;
	association: 'point' | 'cell';
	values: Float64Array;
}

export interface VtkCell {
	type: number;
	points: number[];
}

/** 入力座標と解析値。描画ライブラリの実体は持たない。 */
export interface VtkData {
	points: Float64Array;
	cells: VtkCell[];
	scalars: VtkScalar[];
	/** 複数Pieceの面照合用。スカラーの点番号とは別に保持する。 */
	topologyIds?: Uint32Array;
}

export interface VtkSurface {
	points: Float64Array;
	/** 追加頂点の補間元。元の点数を引いた添字で参照する。 */
	interpolations: { ids: number[]; weights: number[]; }[];
	pointIndices: Uint32Array;
	cellIndices: Uint32Array;
	ignoredCellCount: number;
}

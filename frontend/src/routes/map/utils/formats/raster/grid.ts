/** 復号済みの数値格子。transformはピクセル外縁を原点とする。 */
export interface RasterGrid {
	width: number;
	height: number;
	bandCount: number;
	bands: Float64Array[];
	ranges: { min: number; max: number; }[];
	bbox: [number, number, number, number];
	transform: [number, number, number, number, number, number] | null;
	crs: string;
	defaultBands: number[];
}

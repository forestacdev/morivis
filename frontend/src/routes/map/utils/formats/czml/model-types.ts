export interface CzmlModelFrame {
	timeIndex: number;
	position: [number, number, number];
	/** East/North/Up座標系でのglTFモデルの回転（列優先3×3）。 */
	rotation: number[];
	scale: number;
}

export interface CzmlModel {
	id: string;
	name: string;
	uri: string;
	frames: CzmlModelFrame[];
}

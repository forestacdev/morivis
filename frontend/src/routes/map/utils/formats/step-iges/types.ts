export type CadFormat = 'step' | 'iges';
export type CadUpAxis = 'z' | 'y';

export interface CadNode {
	name: string;
	meshes: number[];
	children: CadNode[];
}

export interface CadMesh {
	name: string;
	color?: number[];
	attributes: {
		position: { array: number[]; };
		normal?: { array: number[]; };
	};
	index: { array: number[]; };
	brep_faces?: { first: number; last: number; color: number[] | null; }[];
}

export interface CadImportResult {
	success: boolean;
	root?: CadNode;
	meshes?: CadMesh[];
}

export interface CadImporter {
	ReadStepFile: (data: Uint8Array, options: { linearUnit: 'meter'; }) => CadImportResult;
	ReadIgesFile: (data: Uint8Array, options: { linearUnit: 'meter'; }) => CadImportResult;
}

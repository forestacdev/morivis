import { getShapefileDataset } from '$routes/map/utils/formats/shp/files';

export type ShpFormSchema = {
	shpFile: File | null;
	dbfFile: File | null;
	shxFile: File | null;
	prjFile: File | null;
	shpName: string;
	dbfName: string;
	shxName: string;
	prjName: string;
};

export type ShapeFileFormState = {
	forms: ShpFormSchema;
	cpgFile: File | null;
	cpgName: string;
};

export const createEmptyShpFormSchema = (): ShpFormSchema => ({
	shpFile: null,
	dbfFile: null,
	shxFile: null,
	prjFile: null,
	shpName: '',
	dbfName: '',
	shxName: '',
	prjName: ''
});

export const createEmptyShapeFileFormState = (): ShapeFileFormState => ({
	forms: createEmptyShpFormSchema(),
	cpgFile: null,
	cpgName: ''
});

const mergeShapeRelatedFile = (state: ShapeFileFormState, file: File): ShapeFileFormState => {
	const fileName = file.name;
	const lowerFileName = fileName.toLowerCase();

	if (lowerFileName.endsWith('.shp')) {
		return {
			...state,
			forms: {
				...state.forms,
				shpFile: file,
				shpName: fileName
			}
		};
	}

	if (lowerFileName.endsWith('.dbf')) {
		return {
			...state,
			forms: {
				...state.forms,
				dbfFile: file,
				dbfName: fileName
			}
		};
	}

	if (lowerFileName.endsWith('.prj')) {
		return {
			...state,
			forms: {
				...state.forms,
				prjFile: file,
				prjName: fileName
			}
		};
	}

	if (lowerFileName.endsWith('.shx')) {
		return {
			...state,
			forms: {
				...state.forms,
				shxFile: file,
				shxName: fileName
			}
		};
	}

	if (lowerFileName.endsWith('.cpg')) {
		return {
			...state,
			cpgFile: file,
			cpgName: fileName
		};
	}

	return state;
};

export const mergeShapeRelatedFiles = (
	state: ShapeFileFormState,
	files: File[]
): ShapeFileFormState => {
	const incoming = getShapefileDataset(files);
	// 一括ドロップ内の混在を検出してから状態を更新する。失敗時には元の選択を保つ。
	const next = incoming.files.reduce(
		(currentState, file) => mergeShapeRelatedFile(currentState, file),
		state
	);
	getShapefileDataset(getShapeSelectedFiles(next));
	return next;
};

export const getShapeSelectedFiles = (state: ShapeFileFormState): File[] =>
	[
		state.forms.shpFile,
		state.forms.dbfFile,
		state.forms.shxFile,
		state.forms.prjFile,
		state.cpgFile
	]
		.filter((file): file is File => file !== null);

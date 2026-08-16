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
	return files.reduce((currentState, file) => mergeShapeRelatedFile(currentState, file), state);
};

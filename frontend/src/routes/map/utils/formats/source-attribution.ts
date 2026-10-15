type UploadSourceFile = File & { morivisSourceAttribution?: string; };

const EXTENSION_LABELS: Record<string, string> = {
	tif: 'GeoTIFF',
	tiff: 'GeoTIFF',
	jpg: 'JPEG',
	jpeg: 'JPEG',
	webp: 'WebP',
	gltf: 'glTF',
	stp: 'STEP',
	igs: 'IGES',
	wrl: 'VRML'
};

/** 変換後のファイルでも、アップロード元の出典を優先する。 */
export const getUploadAttribution = (file: File, fallback?: string): string => {
	const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
	return (file as UploadSourceFile).morivisSourceAttribution
		?? fallback
		?? EXTENSION_LABELS[extension]
		?? extension.toUpperCase();
};

/** フォーム間で渡す一時ファイルに、変換前の出典を引き継ぐ。 */
export const withUploadAttribution = <T extends File>(file: T, attribution: string): T =>
	Object.assign(file, { morivisSourceAttribution: attribution });

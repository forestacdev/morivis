import { getMatchedExtension } from '$routes/map/utils/upload-matchers-common';

const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.heic', '.heif'];
const XML_EXTENSION = '.xml';

export const MODEL_FILE_EXTENSIONS = [
	'.gltf',
	'.vrm',
	'.obj',
	'.3ds',
	'.dae',
	'.3dm',
	'.fbx',
	'.drc',
	'.3mf',
	'.amf',
	'.ifc',
	'.pmx'
] as const;

// ディレクトリドロップ時は仮想的な相対パスを優先し、拡張子判定を安定させる。
export const getPathLikeName = (file: File): string => {
	const relativePath = (file as File & { morivisRelativePath?: string; }).morivisRelativePath;
	return (relativePath ?? file.name).toLowerCase();
};

// 単一拡張子の一致判定。OBJ+MTL のような複数ファイル判定の基本単位として使う。
export const hasExtension = (file: File, extension: string): boolean =>
	getPathLikeName(file).endsWith(extension);

// 同種グループの拡張子をまとめて見るときの判定。
export const hasAnyExtension = (file: File, extensions: readonly string[]): boolean =>
	extensions.some((extension) => hasExtension(file, extension));

// ファイル群から、指定した拡張子セットに最初に当たる代表ファイルを返す。
export const findFirstByExtensions = (
	files: File[],
	extensions: readonly string[]
): File | null => files.find((file) => hasAnyExtension(file, extensions)) ?? null;

// 拡張子なし HRIT のようなケースを分けるため、「拡張子らしきものがあるか」だけを見る。
export const hasKnownExtension = (file: File): boolean => {
	const name = file.name;
	const dotIndex = name.lastIndexOf('.');
	return dotIndex > 0 && dotIndex < name.length - 1;
};

// Shapefile は複数拡張子の集合で扱うため、どれか1つでもあれば関連ファイルとみなす。
export const isShapeFileRelated = (file: File): boolean =>
	/\.(shp|dbf|prj|shx|cpg)$/i.test(file.name);

// GTFS テキスト一式かどうかを、最低限必要な主要ファイル名で見る。
export const isGtfsTextSet = (files: File[]): boolean => {
	const normalizedNames = new Set(files.map((file) => file.name.toLowerCase()));
	return ['agency.txt', 'routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt'].every((name) =>
		normalizedNames.has(name)
	);
};

// 写真一括ドロップ時は geophoto / 通常画像の分岐を後段で行うため、まず集合として判定する。
export const areAllPhotoFiles = (files: File[]): boolean =>
	files.length > 0 && files.every((file) => hasAnyExtension(file, PHOTO_EXTENSIONS));

// 複数 XML は 1 件ずつ拡張子で振り分けず、先頭内容を見てまとめて判定する入口に使う。
export const areAllXmlFiles = (files: File[]): boolean =>
	files.length > 0 && files.every((file) => hasExtension(file, XML_EXTENSION));

// 複数ドロップの最後のフォールバック。既知拡張子の代表 1 件を再帰的に単体判定へ回す。
export const findFirstSupportedFile = (files: File[]): File | null =>
	files.find((file) => !!getMatchedExtension(file.name)) ?? null;

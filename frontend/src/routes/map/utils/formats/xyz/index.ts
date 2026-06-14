/**
 * 点群テキストファイルのパーサー
 *
 * 各行が次のいずれかの形式で並ぶテキストファイルを読み込み、
 * Float32Array (positions) と Uint8Array (colors) に変換する。
 *
 * - X Y Z
 * - ID X Y Z
 * - X Y Z R G B
 * - ID X Y Z R G B
 *
 * 区切り文字はスペース、タブ、カンマに対応。
 */

export interface XyzParseResult {
	positions: Float32Array;
	colors: Uint8Array | null;
	pointCount: number;
}

type PointCloudTextSchema = 'xyz' | 'idxyz' | 'xyzrgb' | 'idxyzrgb';

const splitValues = (line: string): string[] => line.trim().split(/[\s,]+/);

const isNumericColumnSet = (values: string[]): boolean =>
	values.length > 0
	&& values.every((value) => value.length > 0 && Number.isFinite(Number(value)));

const detectSchema = (values: string[]): PointCloudTextSchema | null => {
	if (!isNumericColumnSet(values)) return null;

	switch (values.length) {
		case 3:
			return 'xyz';
		case 4:
			return 'idxyz';
		case 6:
			return 'xyzrgb';
		case 7:
			return 'idxyzrgb';
		default:
			return null;
	}
};

const getSchemaOffsets = (schema: PointCloudTextSchema) => {
	switch (schema) {
		case 'xyz':
			return { positionOffset: 0, colorOffset: null };
		case 'idxyz':
			return { positionOffset: 1, colorOffset: null };
		case 'xyzrgb':
			return { positionOffset: 0, colorOffset: 3 };
		case 'idxyzrgb':
			return { positionOffset: 1, colorOffset: 4 };
	}
};

export const isPointCloudTextFile = async (file: File): Promise<boolean> => {
	try {
		const header = await file.slice(0, 8192).text();
		const lines = header.split(/\r?\n/).filter((line) => {
			const trimmed = line.trim();
			return trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('//');
		});

		if (lines.length === 0) return false;

		const sampleLines = lines.slice(0, 5);
		return sampleLines.every((line) => detectSchema(splitValues(line)) !== null);
	} catch {
		return false;
	}
};

export const parseXyzFile = async (file: File): Promise<XyzParseResult> => {
	const text = await file.text();
	const lines = text.split(/\r?\n/).filter((line) => {
		const trimmed = line.trim();
		// 空行・コメント行をスキップ
		return trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('//');
	});

	if (lines.length === 0) {
		return { positions: new Float32Array(0), colors: null, pointCount: 0 };
	}

	const schema = detectSchema(splitValues(lines[0]));
	if (!schema) {
		throw new Error('対応していない点群テキスト形式です');
	}

	const { positionOffset, colorOffset } = getSchemaOffsets(schema);
	const hasColor = colorOffset !== null;

	const posArray: number[] = [];
	const colArray: number[] = [];

	for (const line of lines) {
		const values = splitValues(line);
		if (detectSchema(values) !== schema) continue;

		const x = parseFloat(values[positionOffset]);
		const y = parseFloat(values[positionOffset + 1]);
		const z = parseFloat(values[positionOffset + 2]);

		if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

		posArray.push(x, y, z);

		if (hasColor && colorOffset !== null) {
			const r = parseInt(values[colorOffset], 10);
			const g = parseInt(values[colorOffset + 1], 10);
			const b = parseInt(values[colorOffset + 2], 10);
			colArray.push(
				isFinite(r) ? Math.max(0, Math.min(255, r)) : 255,
				isFinite(g) ? Math.max(0, Math.min(255, g)) : 255,
				isFinite(b) ? Math.max(0, Math.min(255, b)) : 255
			);
		}
	}

	const pointCount = posArray.length / 3;
	const positions = new Float32Array(posArray);
	const colors = hasColor && colArray.length === pointCount * 3 ? new Uint8Array(colArray) : null;

	return { positions, colors, pointCount };
};

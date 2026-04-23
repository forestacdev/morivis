/**
 * XYZ点群テキストファイルのパーサー
 *
 * 各行が "X Y Z" または "X Y Z R G B" 形式のテキストファイルを読み込み、
 * Float32Array (positions) と Uint8Array (colors) に変換する。
 * 区切り文字はスペース、タブ、カンマに対応。
 */

export interface XyzParseResult {
	positions: Float32Array;
	colors: Uint8Array | null;
	pointCount: number;
}

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

	// 最初の行から列数を判定
	const firstValues = lines[0].trim().split(/[\s,]+/);
	const numColumns = firstValues.length;
	const hasColor = numColumns >= 6;

	const posArray: number[] = [];
	const colArray: number[] = [];

	for (const line of lines) {
		const values = line.trim().split(/[\s,]+/);
		if (values.length < 3) continue;

		const x = parseFloat(values[0]);
		const y = parseFloat(values[1]);
		const z = parseFloat(values[2]);

		if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

		posArray.push(x, y, z);

		if (hasColor && values.length >= 6) {
			const r = parseInt(values[3], 10);
			const g = parseInt(values[4], 10);
			const b = parseInt(values[5], 10);
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

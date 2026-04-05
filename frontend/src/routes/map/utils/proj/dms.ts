/**
 * 度分秒(DMS)を10進度(Decimal Degrees)に変換する
 *
 * @param degrees - 度
 * @param minutes - 分
 * @param seconds - 秒
 * @param direction - 方角 ('N' | 'S' | 'E' | 'W')（省略時は正の値）
 * @returns 10進度
 *
 * @example
 * dmsToDecimal(35, 39, 29.1572) // => 35.658099...
 * dmsToDecimal(139, 44, 28.8759, 'E') // => 139.741354...
 * dmsToDecimal(33, 51, 30, 'S') // => -33.858333...
 */
export const dmsToDecimal = (
	degrees: number,
	minutes: number,
	seconds: number,
	direction?: 'N' | 'S' | 'E' | 'W'
): number => {
	const decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;
	return direction === 'S' || direction === 'W' ? -decimal : decimal;
};

/**
 * 度分秒文字列をパースして10進度に変換する
 *
 * 対応フォーマット:
 * - "35°39'29.1572\"N"
 * - "35° 39' 29.1572\" N"
 * - "35d39m29.1572sN"
 * - "35 39 29.1572 N"
 * - "35 39 29.1572" (方角なし)
 * - "-35 39 29.1572" (負の度)
 *
 * @param dmsString - 度分秒文字列
 * @returns 10進度、パース失敗時はnull
 */
export const parseDmsString = (dmsString: string): number | null => {
	const trimmed = dmsString.trim();
	if (!trimmed) return null;

	// °'"dms やスペースを区切りとして数値3つ + 任意の方角を抽出
	const match = trimmed.match(
		/^(-?\d+(?:\.\d+)?)[°d\s]+(\d+(?:\.\d+)?)[′'m\s]+(\d+(?:\.\d+)?)[″"s\s]*([NSEW])?$/i
	);
	if (!match) return null;

	const degrees = parseFloat(match[1]);
	const minutes = parseFloat(match[2]);
	const seconds = parseFloat(match[3]);
	const direction = match[4]?.toUpperCase() as 'N' | 'S' | 'E' | 'W' | undefined;

	if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;

	const sign = degrees < 0 ? -1 : 1;
	const decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;

	if (direction === 'S' || direction === 'W') return -decimal;
	return sign * decimal;
};

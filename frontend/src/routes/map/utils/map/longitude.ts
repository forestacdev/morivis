/**
 * Detect the longitude domain based on the first and last longitude values.
 *
 * https://github.com/cf-convention/cf-conventions/issues/435?utm_source=chatgpt.com
 *
 * @param first - The first longitude value.
 * @param last - The last longitude value.
 * @returns '180' if both values are in the range [0, 180], '360' if both are in [0, 360], or 'indeterminate' otherwise.
 */
export const detectLongitudeDomain = (
	first: number,
	last: number
): '180' | '360' | 'indeterminate' => {
	if (first < 0 || last < 0) return '180';
	if (first > 180 || last > 180) return '360';
	return 'indeterminate'; // 両方 0〜180 の場合
};

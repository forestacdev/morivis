// TODO: 整理する 必要ない関数を削除する
/**
 * minからmaxまでを指定した分割数で分割し、数値の配列を生成する関数
 *
 * @param min 最小値
 * @param max 最大値
 * @param divisions 分割数
 * @returns 数値の配列
 */
const generateNumberMap = (min: number, max: number, divisions: number): number[] => {
	if (divisions <= 0) {
		throw new Error('divisions must be greater than 0');
	}

	const step = (max - min) / divisions; // 分割ごとの間隔
	const result: number[] = [];

	for (let i = 0; i <= divisions; i++) {
		result.push(min + step * i);
	}

	return result;
};

const min = 0;
const max = 100;
const divisions = 5;

const numberMap = generateNumberMap(min, max, divisions);
// console.log(numberMap); // [ 0, 20, 40, 60, 80, 100 ]

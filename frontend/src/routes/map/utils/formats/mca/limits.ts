export const DEFAULT_MCA_MAX_FACES = 0;

export const resolveMcaMaxFaces = (value = DEFAULT_MCA_MAX_FACES): number => {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error('面数上限は0以上の整数で指定してください（0は制限なし）');
	}
	return value === 0 ? Infinity : value;
};

export const createMcaFaceLimitError = (maxFaces: number): Error =>
	Object.assign(
		new Error(
			`表示する面が多すぎます。読み込み全体の面数上限（${
				maxFaces.toLocaleString('ja-JP')
			}面）に達しました。チャンク範囲を狭めてください。`
		),
		{ name: 'McaFaceLimitError' }
	);

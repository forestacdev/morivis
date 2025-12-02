// 基本的なHTMLエスケープ
// HTMLタグを含んでいたら空文字列を返す
export const stripHTMLTags = (str: unknown): string => {
	if (typeof str !== 'string') {
		return '';
	}

	const stripText = str.replace(/<[^>]*>/g, '');

	if (import.meta.env.DEV) {
		console.warn(`HTMLを除去Original: ${str}, Stripped: ${stripText}`);
	}
	// HTMLタグを全て除去
	return stripText;
};

/** 空白文字のみかどうかを判定する関数 */
export const isOnlySpaces = (str: unknown): boolean => {
	if (typeof str !== 'string') {
		return false;
	}

	// 半角スペース、全角スペース、タブなどの空白文字のみかチェック
	return /^[\s　]*$/.test(str);
};

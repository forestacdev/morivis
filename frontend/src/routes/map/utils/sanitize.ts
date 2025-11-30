// 基本的なHTMLエスケープ
// HTMLタグを含んでいたら空文字列を返す
export const stripHTMLTags = (str: unknown): string => {
	if (typeof str !== 'string') {
		return '';
	}

	// HTMLタグを全て除去
	return str.replace(/<[^>]*>/g, '');
};

/**　空白文字のみかどうかを判定する関数 */
export const isOnlySpaces = (str: unknown): boolean => {
	if (typeof str !== 'string') {
		return false;
	}

	// 半角スペース、全角スペース、タブなどの空白文字のみかチェック
	return /^[\s　]*$/.test(str);
};

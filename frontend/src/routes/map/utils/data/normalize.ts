// mojiの読み込み
import moji from 'moji';

// テキストのエンコード
export const encode = (text: string) => {
	return moji(text)
		.convert('HK', 'ZK') // 半角カタカナを全角カタカナに変換
		.convert('ZS', 'HS') // 全角スペースを半角スペースに変換
		.convert('ZE', 'HE') // 全角英数字を半角英数字に変換
		.convert('HG', 'KK') // 全角ひらがなを全角カタカナに変換
		.toString()
		.replace(/\s+/g, '') // 空白の削除
		.toLowerCase(); // 半角英数を小文字に変換
};

export const normalizeSchoolName = (name: string): string => {
	let normalized = name;

	// 1. 全角・半角の統一
	normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
		return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
	});

	// 2. 先頭の私立、県立、道立、都立、市立を削除
	normalized = normalized.replace(/^私立/, '');
	normalized = normalized.replace(/^県立/, '');
	normalized = normalized.replace(/^道立/, '');
	normalized = normalized.replace(/^都立/, '');
	normalized = normalized.replace(/^市立/, '');

	// 2. 「県立」の補完
	const prefectures = [
		'北海道',
		'青森',
		'岩手',
		'宮城',
		'秋田',
		'山形',
		'福島',
		'茨城',
		'栃木',
		'群馬',
		'埼玉',
		'千葉',
		'東京',
		'神奈川',
		'新潟',
		'富山',
		'石川',
		'福井',
		'山梨',
		'長野',
		'岐阜',
		'静岡',
		'愛知',
		'三重',
		'滋賀',
		'京都',
		'大阪',
		'兵庫',
		'奈良',
		'和歌山',
		'鳥取',
		'島根',
		'岡山',
		'広島',
		'山口',
		'徳島',
		'香川',
		'愛媛',
		'高知',
		'福岡',
		'佐賀',
		'長崎',
		'熊本',
		'大分',
		'宮崎',
		'鹿児島',
		'沖縄'
	];

	// 「県立」がなく、都道府県名で始まらない場合
	if (
		!normalized.includes('県立') &&
		!normalized.includes('都立') &&
		!normalized.includes('府立')
	) {
		// 末尾から都道府県を推測
		for (const pref of prefectures) {
			// パターン: 「岐阜各務野高等学校」→「岐阜県立岐阜各務野高等学校」
			if (normalized.includes(pref) && !normalized.startsWith(pref)) {
				const parts = normalized.split(pref);
				if (parts.length > 1) {
					normalized = `${pref}県立${pref}${parts[1]}`;
					break;
				}
			}
		}
	}

	// 3. 「高校」→「高等学校」の統一
	normalized = normalized.replace(/高校$/, '高等学校');
	normalized = normalized.replace(/中学$/, '中学校');

	// 4. スペースの削除
	normalized = normalized.replace(/\s+/g, '');

	return normalized;
};

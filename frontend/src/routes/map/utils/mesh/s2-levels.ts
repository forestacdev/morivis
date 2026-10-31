// 地図ズームごとに1段階細分化する。表示範囲のセルだけを生成する。
export const S2_LEVELS = Array.from({ length: 24 }, (_, level) => ({
	level,
	minzoom: level,
	maxzoom: level + 1
}));

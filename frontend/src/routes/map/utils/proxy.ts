/**
 * CORSプロキシ設定の唯一の定義元
 *
 * 新しいCORSエラーが出たときは PROXY_RULES にエントリを追加するだけでよい。
 * - vite.config.ts の server.proxy は buildViteProxyConfig() で自動生成
 * - MapLibre の transformRequest は devProxyTransform() で URL を書き換え
 */

interface ProxyRule {
	/** マッチさせるホスト名（部分一致） */
	match: string;
	/** 転送先オリジン */
	target: string;
	/** プロキシパスのプレフィックス（例: "/api/qchizu"） */
	proxyPath: string;
	/** このURLでスキップする拡張子（例: [".pbf"]） */
	excludeExt?: string[];
}

export const PROXY_RULES: ProxyRule[] = [
	{ match: 'mapdata.qchizu.xyz', target: 'https://mapdata.qchizu.xyz', proxyPath: '/api/qchizu' },
	{
		match: 'rinya-hyogo.geospatial.jp',
		target: 'https://rinya-hyogo.geospatial.jp',
		proxyPath: '/api/rinya-hyogo',
		excludeExt: ['.pbf']
	},
	{
		match: 'rinya-kochi.geospatial.jp',
		target: 'https://rinya-kochi.geospatial.jp',
		proxyPath: '/api/rinya-kochi',
		excludeExt: ['.pbf']
	},
	{
		match: 'rinya-toyama.geospatial.jp',
		target: 'https://rinya-toyama.geospatial.jp',
		proxyPath: '/api/rinya-toyama',
		excludeExt: ['.pbf']
	},
	{
		match: 'rinya-ehime.geospatial.jp',
		target: 'https://rinya-ehime.geospatial.jp',
		proxyPath: '/api/rinya-ehime'
	},
	{
		match: 'localhost:9000',
		target: 'http://localhost:9000',
		proxyPath: '/api/font-server'
	}
];

/**
 * MapLibre の transformRequest に渡す関数。
 * dev環境のみ動作し、PROXY_RULES に従って URL を書き換える。
 */
export const devProxyTransform = (url: string): { url: string } => {
	for (const rule of PROXY_RULES) {
		if (!url.includes(rule.match)) continue;
		if (rule.excludeExt?.some((ext) => url.endsWith(ext))) return { url };
		return { url: url.replace(rule.target, rule.proxyPath) };
	}
	return { url };
};

/**
 * vite.config.ts の server.proxy に渡すオブジェクトを生成する。
 * PROXY_RULES から自動生成されるため、手動で vite.config.ts を編集する必要はない。
 */
export const buildViteProxyConfig = () => {
	const config: Record<
		string,
		{ target: string; changeOrigin: boolean; rewrite: (path: string) => string }
	> = {};

	for (const rule of PROXY_RULES) {
		const { proxyPath, target } = rule;
		config[proxyPath] = {
			target,
			changeOrigin: true,
			rewrite: (path) => path.replace(new RegExp(`^${proxyPath}`), '')
		};
	}

	// 特殊ルール（rewriteが異なるもの）
	config['/api/google-suggest'] = {
		target: 'https://suggestqueries.google.com',
		changeOrigin: true,
		rewrite: (path) => path.replace(/^\/api\/google-suggest/, '/complete/search')
	};

	return config;
};

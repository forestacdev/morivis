/**
 * CORSプロキシ設定の唯一の定義元
 *
 * 新しいCORSエラーが出たときは STATIC_PROXY_RULES か
 * CLOUDFRONT_PUBLIC_ENV_RULES にエントリを追加するだけでよい。
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

interface CloudFrontPublicEnvRule {
	envKey: string;
	proxyPath: string;
}

type PublicEnvValues = Record<string, string | undefined>;

const CLOUDFRONT_PUBLIC_ENV_RULES: CloudFrontPublicEnvRule[] = [
	{ envKey: 'PUBLIC_BASE_PATH', proxyPath: '/api/cloudfront-assets' },
	{ envKey: 'PUBLIC_ENTRY_PATH', proxyPath: '/api/cloudfront-entry' },
	{ envKey: 'PUBLIC_PANORAMA_PATH', proxyPath: '/api/cloudfront-panorama' },
	{ envKey: 'PUBLIC_TIMBER_SPECIES_PATH', proxyPath: '/api/cloudfront-timber-species' },
	{ envKey: 'PUBLIC_DISASTER_LORE_ALL_PATH', proxyPath: '/api/cloudfront-disaster-lore' }
];

const STATIC_PROXY_RULES: ProxyRule[] = [
	{ match: 'mapdata.qchizu.xyz', target: 'https://mapdata.qchizu.xyz', proxyPath: '/api/qchizu' },
	{
		match: 'www2.ffpri.go.jp',
		target: 'https://www2.ffpri.go.jp',
		proxyPath: '/api/ffpri'
	},
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
		proxyPath: '/api/rinya-ehime',
		excludeExt: ['.pbf']
	},
	{
		match: 'rinya-tottori.geospatial.jp',
		target: 'https://rinya-tottori.geospatial.jp',
		proxyPath: '/api/rinya-tottori',
		excludeExt: ['.pbf']
	},
	{
		match: 'rinya-tiles.geospatial.jp',
		target: 'https://rinya-tiles.geospatial.jp',
		proxyPath: '/api/rinya-tiles'
	},
	{
		match: 'rinya-tochigi.geospatial.jp',
		target: 'https://rinya-tochigi.geospatial.jp',
		proxyPath: '/api/rinya-tochigi',
		excludeExt: ['.pbf']
	},
	{
		match: 'tile.geospatial.jp',
		target: 'https://tile.geospatial.jp',
		proxyPath: '/api/tile-geospatial',
		excludeExt: ['.pbf']
	},
	{
		match: 'map.ecoris.info',
		target: 'https://map.ecoris.info',
		proxyPath: '/api/ecoris'
	},
	{
		match: 'objects.eodc.eu',
		target: 'https://objects.eodc.eu',
		proxyPath: '/api/eodc-objects'
	},
	{
		match: 'api.explorer.eopf.copernicus.eu',
		target: 'https://api.explorer.eopf.copernicus.eu',
		proxyPath: '/api/copernicus-eopf'
	},
	{
		match: 'ahocevar.com',
		target: 'https://ahocevar.com',
		proxyPath: '/api/ahocevar'
	},
	{
		match: 'localhost:9000',
		target: 'http://localhost:9000',
		proxyPath: '/api/font-server'
	}
];

const createCloudFrontProxyRule = (
	value: string | undefined,
	proxyPath: string
): ProxyRule | null => {
	if (!value) return null;

	try {
		const url = new URL(value);
		return {
			match: url.hostname,
			target: url.origin,
			proxyPath
		};
	} catch {
		return null;
	}
};

const getRuntimePublicEnvValue = (key: string): string | undefined => {
	const value = import.meta.env?.[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const dedupeProxyRules = (rules: ProxyRule[]): ProxyRule[] => {
	const seen = new Set<string>();

	return rules.filter((rule) => {
		const key = `${rule.match}|${rule.target}|${rule.proxyPath}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const buildCloudFrontProxyRules = (publicEnvValues: PublicEnvValues): ProxyRule[] => {
	return CLOUDFRONT_PUBLIC_ENV_RULES.map(({ envKey, proxyPath }) =>
		createCloudFrontProxyRule(publicEnvValues[envKey], proxyPath)
	).filter((rule): rule is ProxyRule => rule !== null);
};

export const buildRuntimeProxyRules = (publicEnvValues: PublicEnvValues = {}): ProxyRule[] => {
	return dedupeProxyRules([...buildCloudFrontProxyRules(publicEnvValues), ...STATIC_PROXY_RULES]);
};

/**
 * MapLibre の transformRequest に渡す関数。
 * development のみ動作し、実行時の proxy ルールに従って URL を書き換える。
 */
export const devProxyTransform = (
	url: string,
	publicEnvValues: PublicEnvValues = {}
): { url: string; } => {
	for (const rule of buildRuntimeProxyRules(publicEnvValues)) {
		if (!url.includes(rule.match)) continue;
		if (rule.excludeExt?.some((ext) => url.endsWith(ext))) return { url };
		return { url: url.replace(rule.target, rule.proxyPath) };
	}
	return { url };
};

/**
 * vite.config.ts の server.proxy に渡すオブジェクトを生成する。
 * publicEnv の CloudFront 配信元と STATIC_PROXY_RULES から自動生成される。
 */
export const buildViteProxyConfig = (publicEnv: Record<string, string | undefined> = {}) => {
	const proxyRules = buildRuntimeProxyRules(publicEnv);
	const config: Record<
		string,
		{ target: string; changeOrigin: boolean; rewrite: (path: string) => string; }
	> = {};

	for (const rule of proxyRules) {
		const { proxyPath, target } = rule;
		config[proxyPath] = {
			target,
			changeOrigin: true,
			rewrite: (path) => path.replace(new RegExp(`^${proxyPath}`), '')
		};
	}

	config['/api/google-suggest'] = {
		target: 'https://suggestqueries.google.com',
		changeOrigin: true,
		rewrite: (path) => path.replace(/^\/api\/google-suggest/, '/complete/search')
	};

	return config;
};

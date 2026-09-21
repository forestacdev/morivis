import catalog from './builtin-asset-catalog.json';

/** 出典・検証方法はbuiltin-assets.md。画像本体は同梱しない。 */
const builtinAssetIds: ReadonlyMap<string, string> = new Map(Object.entries(catalog));

export const getRobloxBuiltinAssetId = (key: string): string | undefined =>
	builtinAssetIds.get(key.replace(/\\/g, '/').toLowerCase());

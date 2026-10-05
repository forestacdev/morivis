import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';

type DwgRuntime = typeof import('../../../../../../static/vendor/dwg-acis/dwg_acis.js');

let initialization: Promise<DwgRuntime> | undefined;

export const loadDwgRuntime = (): Promise<DwgRuntime> => {
	initialization ??= (async () => {
		// staticはソースとしてimportせず、開発・本番共通の公開URLから読み込む。
		const moduleUrl = resolveStaticAssetPath('/vendor/dwg-acis/dwg_acis.js');
		const runtime = await import(/* @vite-ignore */ moduleUrl) as DwgRuntime;
		await runtime.default();
		return runtime;
	})().catch(error => {
		initialization = undefined;
		throw new Error(
			'DWGの変換モジュールを読み込めませんでした。再読み込みしてお試しください。',
			{
				cause: error
			}
		);
	});
	return initialization;
};

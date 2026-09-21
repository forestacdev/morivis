import sharp from 'sharp';
import catalog from '../src/routes/map/utils/formats/roblox/builtin-asset-catalog.json';

/** 対応表を実際の配信画像と照合する。画像の保存・APIキーの使用はしない。 */
const run = async () => {
	const items = Object.entries(catalog);
	const failures: string[] = [];
	let cursor = 0, verified = 0;
	await Promise.all(Array.from({ length: 4 }, async () => {
		while (cursor < items.length) {
			const [path, id] = items[cursor++];
			try {
				if (
					!/^builtin\/(textures|icons|sky)\/[\w./-]+\.(png|jpe?g)$/.test(path)
					|| path.split('/').some(segment => segment === '.' || segment === '..')
					|| !/^[1-9]\d*$/.test(id)
				) throw new Error('対応表の形式が不正です');
				const response = await fetch(
					`https://assetdelivery.roblox.com/v1/asset/?id=${id}`,
					{
						signal: AbortSignal.timeout(20000)
					}
				);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const bytes = new Uint8Array(await response.arrayBuffer());
				const image = sharp(bytes);
				const metadata = await image.metadata();
				if (!['png', 'jpeg'].includes(metadata.format ?? '')) {
					throw new Error('PNG/JPEGではありません');
				}
				await image.stats();
				verified++;
			} catch (error) {
				failures.push(
					`${path} → ${id}: ${error instanceof Error ? error.message : '検証失敗'}`
				);
			}
			const done = verified + failures.length;
			if (done % 40 === 0) console.log(`${done}/${items.length}件 検証済み`);
		}
	}));
	for (const failure of failures) console.error(failure);
	console.log(
		`取得・デコード成功 ${verified}件 / 失敗 ${failures.length}件（画像は保存しません）`
	);
	if (failures.length) process.exitCode = 1;
};

run().catch(error => {
	console.error(error instanceof Error ? error.message : '標準画像の検証に失敗しました');
	process.exitCode = 1;
});

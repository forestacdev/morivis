import { PMTiles } from 'pmtiles';

export const getImagePmtiles = async (
	url: string,
	tile: { x: number; y: number; z: number }
): Promise<string> => {
	const pmtiles = new PMTiles(url);

	// メタデータを取得（必要に応じてログ）
	const metadata = await pmtiles.getHeader();
	console.log('Metadata:', metadata);

	// タイルデータを取得
	const tileData = await pmtiles.getZxy(tile.z, tile.x, tile.y);
	if (!tileData || !tileData.data) {
		throw new Error('Tile data not found');
	}

	// Blob を生成
	const blob = new Blob([tileData.data], { type: 'image/png' });

	// Blob を Base64 エンコードして返す
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			if (reader.result) {
				// Base64データを返す
				resolve(reader.result.toString());
			} else {
				reject(new Error('Failed to convert blob to Base64'));
			}
		};
		reader.onerror = (err) => reject(err);

		// Blob を読み取る
		reader.readAsDataURL(blob);
	});
};

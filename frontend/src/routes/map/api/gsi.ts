interface GsiGetelEvation {
	elevation: number;
	hsrc: string;
}

/**
 * 国土地理院の標高APIを利用して、指定した緯度経度の標高を取得する関数
 * https://maps.gsi.go.jp/development/elevation_s.html
 * @param lng 経度
 * @param lat 緯度
 * @returns 標高 (m)
 */
export const gsiGetElevation = async (lng: number, lat: number): Promise<number> => {
	const url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lng}&lat=${lat}&outtype=JSON`;
	try {
		const response = await fetch(url);
		if (response.ok) {
			// 型アサーションで型を明示
			const data: GsiGetelEvation = await response.json();
			return data.elevation;
		} else {
			throw new Error('Failed to fetch');
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};

// ココタイル
// https://github.com/gsi-cyberjapan/cocotile-spec
// そのタイル位置に存在する（地理院）タイルの {t} がカンマ区切りで羅列されています。
// http://cyberjapandata.gsi.go.jp/xyz/cocotile/{z}/{x}/{y}.csv
export const getCocoTile = async (z: number, x: number, y: number): Promise<string[]> => {
	const url = `https://cyberjapandata.gsi.go.jp/xyz/cocotile/${z}/${x}/${y}.csv`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch coco tile at z:${z}, x:${x}, y:${y}`);
	}
	const text = await response.text();
	return text.split(',').map((t) => t.trim());
};

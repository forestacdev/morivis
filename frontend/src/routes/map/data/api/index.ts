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

interface Address {
	results: {
		muniCd: string;
		lv01Nm: string;
	};
}

import { GSI } from './muni';

// 国土地理院APIの変換表を使って住所コードを住所に変換
const addressCodeToAddress = (addressCode: string) => {
	const csvString = GSI.MUNI_ARRAY[addressCode as keyof typeof GSI.MUNI_ARRAY];
	if (!csvString) return '';
	const parts = csvString.split(',');
	return `${parts[1]}${parts[3]}`;
};

/**
 * 国土地理院APIを利用して、指定した緯度経度から住所情報を取得する関数
 * @param lng 経度
 * @param lat 緯度
 * @returns 住所情報
 */
export const lonLatToAddress = async (lng: number, lat: number): Promise<string> => {
	const url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lng}`;
	try {
		const response = await fetch(url);
		if (response.ok) {
			const data: Address = await response.json();
			const address = addressCodeToAddress(data.results.muniCd);
			return `${address}${data.results.lv01Nm === '－' ? '' : data.results.lv01Nm}`;
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

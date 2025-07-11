interface Address {
	results: {
		muniCd: string;
		lv01Nm: string;
	};
}

import { GSI } from './muni';

// 国土地理院APIの変換表を使って住所コードを住所に変換
export const addressCodeToAddress = (addressCode: string) => {
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

/* 国土地理院APIの住所検索レスポンスデータ */
interface GsiAddressSearchData {
	geometry: {
		coordinates: [number, number];
		type: 'Point';
	};
	type: 'Feature';
	properties: {
		addressCode: string;
		title: string;
	};
}

/** 国土地理院APIの住所検索 */
export const addressSearch = async (
	searchWord: string
): Promise<GsiAddressSearchData[] | undefined> => {
	const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${searchWord}`;
	try {
		const response = await fetch(url, {
			method: 'GET'
		});

		if (response.ok) return response.json();
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};

interface CoordinateResult {
	isCoordinate: boolean;
	lat: number;
	lng: number;
	order: 'lat_lng' | 'lng_lat' | 'unknown';
	confidence: number;
}

// 両方とも緯度範囲内（-90〜90）の場合の詳細判定
const detectAmbiguousOrder = (
	first: number,
	second: number
): {
	lat: number;
	lng: number;
	order: 'lat_lng' | 'lng_lat';
	confidence: number;
} => {
	let confidence = 0.5; // デフォルト信頼度
	let lat = first;
	let lng = second;
	let order: 'lat_lng' | 'lng_lat' = 'lat_lng';

	// ヒューリスティック判定

	// 1. 絶対値が大きい方が経度の可能性が高い
	if (Math.abs(first) > Math.abs(second) + 10) {
		// firstの方が明らかに大きい → firstが経度の可能性
		lat = second;
		lng = first;
		order = 'lng_lat';
		confidence = 0.7;
	} else if (Math.abs(second) > Math.abs(first) + 10) {
		// secondの方が明らかに大きい → secondが経度の可能性
		lat = first;
		lng = second;
		order = 'lat_lng';
		confidence = 0.7;
	}
	// 2. 日本付近の座標パターン（北緯30-45度、東経130-145度）
	else if (first >= 30 && first <= 45 && second >= 130 && second <= 145) {
		// 日本の典型的な緯度,経度パターン
		lat = first;
		lng = second;
		order = 'lat_lng';
		confidence = 0.8;
	} else if (second >= 30 && second <= 45 && first >= 130 && first <= 145) {
		// 経度,緯度パターン
		lat = second;
		lng = first;
		order = 'lng_lat';
		confidence = 0.8;
	}
	// 3. 一般的な慣習: 緯度が先（Google Maps等）
	else {
		lat = first;
		lng = second;
		order = 'lat_lng';
		confidence = 0.55; // わずかに高めの信頼度
	}

	return { lat, lng, order, confidence };
};

export const detectCoordinateOrder = (input: string): CoordinateResult => {
	const pattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
	const match = input.match(pattern);

	if (!match) {
		return {
			isCoordinate: false,
			lat: 0,
			lng: 0,
			order: 'unknown',
			confidence: 0
		};
	}

	const first = parseFloat(match[1]);
	const second = parseFloat(match[2]);

	// 基本的な座標範囲チェック
	const isFirstLat = first >= -90 && first <= 90;
	const isFirstLng = first >= -180 && first <= 180;
	const isSecondLat = second >= -90 && second <= 90;
	const isSecondLng = second >= -180 && second <= 180;

	// 両方とも有効な座標でない場合
	if (!(isFirstLat || isFirstLng) || !(isSecondLat || isSecondLng)) {
		return {
			isCoordinate: false,
			lat: 0,
			lng: 0,
			order: 'unknown',
			confidence: 0
		};
	}

	// 判定ロジック
	let lat: number, lng: number, order: 'lat_lng' | 'lng_lat', confidence: number;

	// ケース1: 最初が明らかに緯度の範囲（-90〜90）で、2番目がそれを超える
	if (isFirstLat && !isSecondLat && isSecondLng) {
		// 緯度, 経度の順序
		lat = first;
		lng = second;
		order = 'lat_lng';
		confidence = 0.95;
	}
	// ケース2: 最初が明らかに経度の範囲で、2番目が緯度の範囲
	else if (!isFirstLat && isFirstLng && isSecondLat) {
		// 経度, 緯度の順序
		lat = second;
		lng = first;
		order = 'lng_lat';
		confidence = 0.95;
	}
	// ケース3: 両方とも緯度の範囲内（-90〜90）の場合
	else if (isFirstLat && isSecondLat) {
		// より詳細な判定が必要
		const result = detectAmbiguousOrder(first, second);
		lat = result.lat;
		lng = result.lng;
		order = result.order;
		confidence = result.confidence;
	}
	// ケース4: 両方とも有効だが判定困難
	else {
		// デフォルトで緯度, 経度として扱う
		lat = first;
		lng = second;
		order = 'lat_lng';
		confidence = 0.5;
	}

	return {
		isCoordinate: true,
		lat,
		lng,
		order,
		confidence
	};
};

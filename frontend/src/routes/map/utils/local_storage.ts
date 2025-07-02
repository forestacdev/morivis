import type { GeoDataEntry } from '$routes/map/data/types';

// localストレージにデータを保存する関数
export const saveToTermsAccepted = () => {
	const data = {
		timestamp: Date.now() // 現在の時刻を保存
	};
	localStorage.setItem('isTermsAccepted', JSON.stringify(data));
};

// 24時間経過しているかどうかを判定する関数
const has24HoursPassed = () => {
	const storedData = localStorage.getItem('isTermsAccepted');

	if (!storedData) {
		return true; // データがない場合は経過済みと見なす
	}

	const { timestamp } = JSON.parse(storedData);
	const currentTime = Date.now();
	const timeDifference = currentTime - timestamp;

	// 24時間 = 24 * 60 * 60 * 1000 ミリ秒
	const hasPassed = timeDifference >= 24 * 60 * 60 * 1000;

	return hasPassed;
};

export const checkToTermsAccepted = () => {
	if (has24HoursPassed()) {
		return true;
	}
	return false;
};

/** レイヤーエントリをlocalStorageに保存する関数 */
export const saveToLayerEntries = (entries: GeoDataEntry[]) => {
	localStorage.setItem('layerEntries', JSON.stringify(entries));
};

/** localStorageからレイヤーエントリを取得する関数 */
export const loadLayerEntries = (): GeoDataEntry[] | null => {
	const entries = localStorage.getItem('layerEntries');
	if (entries && entries !== 'undefined' && entries !== 'null' && entries !== '[]') {
		return JSON.parse(entries);
	}
	return null;
};

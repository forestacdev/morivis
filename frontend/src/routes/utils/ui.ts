import { MOBILE_WIDTH } from '$routes/constants';

/**
 * PC画面かどうかを判定する
 * @returns boolean
 * @description PC画面と判定する関数
 */
export const isPc = () => {
	if (window.innerWidth > MOBILE_WIDTH) {
		return true;
	}
	return false;
};

type MappingType = 'single' | 'match' | 'linear' | 'step';

/**
 * アイコンのスタイルを取得する
 * @param type
 * @returns string
 * @description アイコンのスタイルを取得する関数
 */
export const getIconStyle = (type: MappingType) => {
	if (!type) return 'bxs:color-fill';
	switch (type) {
		case 'match':
			return 'material-symbols:category-rounded';
		case 'step':
			return 'subway:step-1';
		case 'linear':
			return 'mdi:graph-bell-curve-cumulative';
		default:
			return 'bxs:color-fill';
	}
};

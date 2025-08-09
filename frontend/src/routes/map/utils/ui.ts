import { MOBILE_WIDTH } from '$routes/constants';
import type { ExpressionType } from '$routes/map/data/types/vector/style';

/**
 * PC画面かどうかを判定する
 * @returns boolean
 * @description PC画面と判定する関数
 */
export const checkPc = () => {
	if (window.innerWidth > MOBILE_WIDTH) {
		return true;
	}
	return false;
};

/**
 * スマホ画面かどうかを判定する
 * @returns boolean
 * @description スマホ画面と判定する関数
 */
export const checkMobile = () => {
	if (window.innerWidth <= MOBILE_WIDTH) {
		return true;
	}
	return false;
};

export type MobileActiveMenu = 'map' | 'layer' | 'data' | 'other';

type MappingType = 'single' | 'match' | 'linear' | 'step';

/**
 * アイコンのスタイルを取得する
 * @param type
 * @returns string
 * @description アイコンのスタイルを取得する関数
 */
export const getIconStyle = (type: MappingType, expressionType: ExpressionType) => {
	let defaultIcon;

	if (expressionType === 'color') {
		defaultIcon = 'bxs:color-fill';
	} else if (expressionType === 'number') {
		defaultIcon = 'lsicon:number-filled';
	} else {
		defaultIcon = 'bxs:color-fill';
	}

	if (!type) return defaultIcon;
	switch (type) {
		case 'match':
			return 'material-symbols:category-rounded';
		case 'step':
			return 'subway:step-1';
		case 'linear':
			return 'mdi:graph-bell-curve-cumulative';
		default:
			return defaultIcon;
	}
};

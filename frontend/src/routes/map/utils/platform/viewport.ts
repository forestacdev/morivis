import { MOBILE_WIDTH } from '$routes/constants';

/** PC画面かどうかを判定する */
export const checkPc = () => {
	if (window.matchMedia && window.matchMedia(`(min-device-width: ${MOBILE_WIDTH + 1}px)`).matches) {
		return true;
	}
	return false;
};

/** スマホ画面かどうかを判定する */
export const checkMobile = () => {
	if (window.matchMedia && window.matchMedia(`(max-device-width: ${MOBILE_WIDTH}px)`).matches) {
		return true;
	}
	return false;
};

/** PCブラウザでのスマホ画面サイズかどうかを判定する */
export const checkMobileWidth = () => {
	if (window.innerWidth <= MOBILE_WIDTH) {
		return true;
	}
	return false;
};

export type MobileActiveMenu = 'map' | 'layer' | 'data' | 'other';

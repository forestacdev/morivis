import { MOBILE_WIDTH } from '$routes/constants';

/**
 * モバイル画面かどうかを判定する
 * @returns boolean
 * @description モバイル画面と判定する関数
 */
export const isMobile = () => {
	if (window.innerWidth <= MOBILE_WIDTH) {
		return true;
	}
	return false;
};

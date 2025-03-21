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

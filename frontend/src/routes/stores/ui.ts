import { browser } from '$app/environment';
import { MOBILE_WIDTH } from '$routes/constants';
import { checkPc, type MobileActiveMenu } from '$routes/map/utils/platform/viewport';
import { readable, writable } from 'svelte/store';

/** 処理中の状態 */
export const isProcessing = writable<boolean>(false);

/** スクリーンガードの状態 */
export const isBlocked = writable<boolean>(false);

/** サイドメニューの表示状態 */
export const showOtherMenu = writable<boolean>(false);

/** レイヤーメニューの表示 */
export const showLayerMenu = writable<boolean>(checkPc() ? true : false);

/** データメニューの表示 */
export const showDataMenu = writable<boolean>(false);

/** インフォメーションの表示 */
export const showInfoDialog = writable<boolean>(false);

/** 利用規約ダイアログの表示 */
export const showTermsDialog = writable<boolean>(false);

/** 検索ーメニューの表示 */
export const showSearchMenu = writable<boolean>(false);

/** 検索メニューのサジェスト */
export const showSearchSuggest = writable<boolean>(false);

/** モバイルフッターの状態 */
export const isActiveMobileMenu = writable<MobileActiveMenu>('map');

/** スタイル編集モード */
export const isStyleEdit = writable<boolean>(false);

/** ストリートビュー */
export const isStreetView = writable<boolean>(false);

/** 登録済み3Dモデルの位置合わせを開くリクエスト。 */
export const modelGeoreferenceRequest = writable<string | null>(null);

/** 単体3Dモデルビューの表示状態 */
export const showModelView = writable<boolean>(false);

/** PWAのインストール手順 */
export const showPwaManuelDialog = writable<boolean>(false);

/** モバイルデバイスかどうか */

export const isMobile = readable(false, (set) => {
	if (!browser) return;
	const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_WIDTH}px)`);

	// 初期値を設定
	set(mediaQuery.matches);

	// 変更を監視
	const handler = (e: MediaQueryListEvent) => set(e.matches);
	mediaQuery.addEventListener('change', handler);

	// クリーンアップ
	return () => mediaQuery.removeEventListener('change', handler);
});

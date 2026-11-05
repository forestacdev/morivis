import { pushState, replaceState } from '$app/navigation';
import { page as currentPage } from '$app/state';
import { page } from '$app/stores';
import * as ui from '$routes/stores/ui';
import { type MenuHistoryState, startMenuHistory } from './menu-history';
import { checkMobile } from './viewport';

/** ルーターの初期化完了後、地図ページのafterNavigateから一度だけ呼ぶ。 */
export const mountMenuHistory = () => {
	const routeId = currentPage.route.id;
	const withMenu = (menuHistory: MenuHistoryState): App.PageState => ({
		...currentPage.state,
		menuHistory
	});
	return startMenuHistory(ui, {
		push: state => {
			if (currentPage.route.id === routeId) pushState('', withMenu(state));
		},
		replace: state => {
			if (currentPage.route.id === routeId) replaceState('', withMenu(state));
		},
		subscribe: restore =>
			page.subscribe(value => {
				if (value.route.id === routeId) restore(value.state.menuHistory);
			})
	}, checkMobile());
};

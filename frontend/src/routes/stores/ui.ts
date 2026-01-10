import type { UseEventTriggerType } from '$routes/map/types/ui';
import { get, writable } from 'svelte/store';
import { checkMobile, checkPc, type MobileActiveMenu } from '$routes/map/utils/ui';
import { browser } from '$app/environment';
import { MOBILE_WIDTH } from '$routes/constants';
import { isStreetView, isStyleEdit } from '$routes/stores';

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

/** モバイルデバイスかどうか */
export const isMobile = writable<boolean>(false);

/** PWAのインストール手順 */
export const showPwaManuelDialog = writable<boolean>(false);

// メディアクエリをチェックして更新する関数
export const setupMediaQueries = (): void => {
	if (!browser) return;

	// 各メディアクエリのチェック関数
	const setMobileState = (): void => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_WIDTH}px)`);
		isMobile.set(mql.matches);
		mql.addEventListener('change', (e) => isMobile.set(e.matches));
	};

	setMobileState();
};
setupMediaQueries();

// 初期化

/** 外部コンポーネントからイベントを発火させるストア */
const eventStore = () => {
	const { subscribe, set } = writable<UseEventTriggerType>('');
	return {
		subscribe,
		trigger: (eventKey: UseEventTriggerType) => {
			set(eventKey);
			setTimeout(() => set(''), 0);
		}
	};
};
export const useEventTrigger = eventStore();

//TODO: 履歴管理の整理

// メニュー状態の型定義
interface MenuState {
	showLayerMenu: boolean;
	showDataMenu: boolean;
	timestamp: number;
}

// ストア名の型定義
type StoreNames = keyof Omit<MenuState, 'timestamp'>;

// 履歴状態の型定義
interface HistoryState extends MenuState {
	[key: string]: any; // 将来的な拡張に対応
}

class MenuHistoryPcManager {
	private isInitialized: boolean = false;
	private isHandlingPopstate: boolean = false;
	private previousState: MenuState;
	private unsubscribers: UnsubscribeFunction[] = [];

	constructor() {
		this.previousState = this.getInitialState();
		this.init();
	}

	private getInitialState(): MenuState {
		return {
			showLayerMenu: false,
			showDataMenu: false,
			timestamp: Date.now()
		};
	}

	private init(): void {
		if (this.isInitialized) return;

		// 初期状態を設定
		this.previousState = this.getCurrentStoreState();

		if (!history.state) {
			history.replaceState(this.previousState, '', null);
		}

		// 各ストアを監視してsubscribe
		this.setupSubscriptions();

		// popstateイベントリスナー
		window.addEventListener('popstate', this.handlePopState.bind(this));

		this.isInitialized = true;
	}

	/**
	 * ストアの現在の値を取得
	 */
	private getCurrentStoreState(): MenuState {
		return {
			showLayerMenu: get(showLayerMenu),
			showDataMenu: get(showDataMenu),
			timestamp: Date.now()
		};
	}

	/**
	 * 各ストアにsubscribeを設定
	 */
	private setupSubscriptions(): void {
		// レイヤーメニューの監視
		const unsubLayerMenu: UnsubscribeFunction = showLayerMenu.subscribe((value: boolean) => {
			this.handleStoreChange('showLayerMenu', value);
		});

		// データメニューの監視
		const unsubDataMenu: UnsubscribeFunction = showDataMenu.subscribe((value: boolean) => {
			this.handleStoreChange('showDataMenu', value);
		});

		// unsubscriber関数を保存（クリーンアップ用）
		this.unsubscribers = [unsubLayerMenu, unsubDataMenu];
	}

	/**
	 * ストアの変更を処理
	 */
	private handleStoreChange(storeName: StoreNames, newValue: boolean): void {
		// popstate処理中は履歴を更新しない（無限ループ防止）
		if (this.isHandlingPopstate) return;

		const oldValue = this.previousState[storeName];

		// 値が実際に変更された場合のみ処理
		if (oldValue !== newValue) {
			if (import.meta.env.DEV) {
				console.log(`${storeName} changed: ${oldValue} → ${newValue}`);
			}

			// 現在の状態を更新
			this.previousState[storeName] = newValue;
			this.previousState.timestamp = Date.now();

			// メニューが開かれた場合のみ履歴に追加
			if (newValue === true && this.shouldAddToHistory(storeName)) {
				const stateToSave: HistoryState = { ...this.previousState };
				history.pushState(stateToSave, '', null);

				if (import.meta.env.DEV) {
					console.log(`履歴に追加: ${storeName} = true`);
				}
			}
			// メニューが閉じられた場合は履歴追加しない
			// （ブラウザバックで自然に前の状態に戻るため）
		}
	}

	/**
	 * 履歴に追加すべきかどうかを判断
	 */
	private shouldAddToHistory(storeName: StoreNames): boolean {
		// レイヤーメニューはPC版では常に表示なので履歴に追加しない
		if (storeName === 'showLayerMenu' && checkPc()) {
			return false;
		}
		return true;
	}

	/**
	 * popstateイベントハンドラー
	 */
	private handlePopState(event: PopStateEvent): void {
		if (import.meta.env.DEV) {
			console.log('Browser back/forward pressed', event.state);
		}

		this.isHandlingPopstate = true;

		if (event.state && this.isValidState(event.state)) {
			this.applyStateToStores(event.state as HistoryState);
		} else {
			// 初期状態に戻す
			const initialState: MenuState = {
				showLayerMenu: checkPc() ? true : false,
				showDataMenu: false,
				timestamp: Date.now()
			};
			this.applyStateToStores(initialState);
		}

		// 少し遅延してフラグをリセット
		setTimeout(() => {
			this.isHandlingPopstate = false;
		}, 10);
	}

	/**
	 * 状態が有効かどうかを確認
	 */
	private isValidState(state: any): state is HistoryState {
		return (
			state &&
			typeof state === 'object' &&
			typeof state.showLayerMenu === 'boolean' &&
			typeof state.showDataMenu === 'boolean'
		);
	}

	/**
	 * 状態をストアに適用
	 */
	private applyStateToStores(state: MenuState | HistoryState): void {
		showLayerMenu.set(state.showLayerMenu ?? true);
		showDataMenu.set(state.showDataMenu ?? false);

		// previousStateも更新
		this.previousState = {
			showLayerMenu: state.showLayerMenu ?? true,
			showDataMenu: state.showDataMenu ?? false,
			timestamp: state.timestamp ?? Date.now()
		};

		if (import.meta.env.DEV) {
			console.log('State applied to stores:', state);
		}
	}

	/**
	 * 現在の状態を取得（外部からアクセス可能）
	 */
	public getCurrentState(): Readonly<MenuState> {
		return { ...this.previousState };
	}

	/**
	 * 開いているメニューの数を取得
	 */
	public getOpenMenuCount(): number {
		let count = 0;
		if (this.previousState.showDataMenu) count++;
		// showLayerMenuはPC版では常に表示なのでカウントしない
		return count;
	}

	/**
	 * 初期化状態を確認
	 */
	public getIsInitialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * クリーンアップメソッド
	 */
	public destroy(): void {
		// すべてのsubscriptionを解除
		this.unsubscribers.forEach((unsubscribe: UnsubscribeFunction) => {
			if (typeof unsubscribe === 'function') {
				unsubscribe();
			}
		});

		// 配列をクリア
		this.unsubscribers = [];

		// popstateリスナーを削除
		window.removeEventListener('popstate', this.handlePopState.bind(this));

		// フラグをリセット
		this.isInitialized = false;

		if (import.meta.env.DEV) {
			console.log('MenuHistoryPcManager destroyed');
		}
	}
}

// メニュー状態の型定義
// メニュー状態の型定義
interface MobileMenuState {
	activeMenu: MobileActiveMenu;
	isStreetView: boolean;
	isStyleEdit: boolean;
	timestamp: number;
}

// 履歴状態の型定義
interface MobileHistoryState extends MobileMenuState {
	[key: string]: any; // 将来的な拡張に対応
}

// unsubscribe関数の型
type UnsubscribeFunction = () => void;

class MenuHistoryMobileManager {
	private isInitialized: boolean = false;
	private isHandlingPopstate: boolean = false;
	private previousState: MobileMenuState;
	private unsubscribers: UnsubscribeFunction[] = [];

	constructor() {
		this.previousState = this.getInitialState();
		this.init();
	}

	private getInitialState(): MobileMenuState {
		return {
			activeMenu: 'map',
			isStreetView: false,
			isStyleEdit: false,
			timestamp: Date.now()
		};
	}

	private init(): void {
		if (this.isInitialized) return;

		// 初期状態を設定
		this.previousState = this.getCurrentStoreState();

		if (!history.state) {
			history.replaceState(this.previousState, '', null);
		}

		// ストアを監視してsubscribe
		this.setupSubscription();

		// popstateイベントリスナー
		window.addEventListener('popstate', this.handlePopState.bind(this));

		this.isInitialized = true;

		if (import.meta.env.DEV) {
			console.log('MenuHistoryMobileManager initialized');
		}
	}

	/**
	 * ストアの現在の値を取得
	 */
	private getCurrentStoreState(): MobileMenuState {
		return {
			activeMenu: get(isActiveMobileMenu),
			isStreetView: get(isStreetView),
			isStyleEdit: get(isStyleEdit),
			timestamp: Date.now()
		};
	}

	/**
	 * ストアにsubscribeを設定
	 */
	private setupSubscription(): void {
		const unsubActiveMobileMenu: UnsubscribeFunction = isActiveMobileMenu.subscribe(
			(value: MobileActiveMenu) => {
				this.handleMenuChange(value);
			}
		);

		const unsubStreetView: UnsubscribeFunction = isStreetView.subscribe((value: boolean) => {
			this.handleStreetViewChange(value);
		});

		const unsubStyleEdit: UnsubscribeFunction = isStyleEdit.subscribe((value: boolean) => {
			this.handleStyleEditChange(value);
		});

		this.unsubscribers = [unsubActiveMobileMenu, unsubStreetView, unsubStyleEdit];
	}

	/**
	 * メニューの変更を処理
	 */
	private handleMenuChange(newValue: MobileActiveMenu): void {
		// popstate処理中は履歴を更新しない（無限ループ防止）
		if (this.isHandlingPopstate) return;

		const oldValue = this.previousState.activeMenu;

		// 値が実際に変更された場合のみ処理
		if (oldValue !== newValue) {
			if (import.meta.env.DEV) {
				console.log(`Mobile menu changed: ${oldValue} → ${newValue}`);
			}

			// 現在の状態を更新
			this.previousState.activeMenu = newValue;
			this.previousState.timestamp = Date.now();

			// mapから他のメニューに移動した場合のみ履歴に追加
			if (this.shouldAddToHistoryForMenu(oldValue, newValue)) {
				const stateToSave: MobileHistoryState = { ...this.previousState };
				history.pushState(stateToSave, '', null);

				if (import.meta.env.DEV) {
					console.log(`履歴に追加 (menu): ${newValue} (from ${oldValue})`);
				}
			}
		}
	}

	/**
	 * ストリートビューの変更を処理
	 */
	private handleStreetViewChange(newValue: boolean): void {
		// popstate処理中は履歴を更新しない（無限ループ防止）
		if (this.isHandlingPopstate) return;

		const oldValue = this.previousState.isStreetView;

		// 値が実際に変更された場合のみ処理
		if (oldValue !== newValue) {
			if (import.meta.env.DEV) {
				console.log(`StreetView changed: ${oldValue} → ${newValue}`);
			}

			// 現在の状態を更新
			this.previousState.isStreetView = newValue;
			this.previousState.timestamp = Date.now();

			// ストリートビューがtrueになった場合のみ履歴に追加
			if (this.shouldAddToHistoryForStreetView(oldValue, newValue)) {
				const stateToSave: MobileHistoryState = { ...this.previousState };
				history.pushState(stateToSave, '', null);

				if (import.meta.env.DEV) {
					console.log(`履歴に追加 (streetView): ${newValue} (from ${oldValue})`);
				}
			}
		}
	}

	private handleStyleEditChange(newValue: boolean): void {
		if (this.isHandlingPopstate) return;

		const oldValue = this.previousState.isStyleEdit;

		// 値が実際に変更された場合のみ処理
		if (oldValue !== newValue) {
			if (import.meta.env.DEV) {
				console.log(`StyleEdit changed: ${oldValue} → ${newValue}`);
			}

			// 現在の状態を更新
			this.previousState.isStyleEdit = newValue;
			this.previousState.timestamp = Date.now();

			// スタイル編集がtrueになった場合のみ履歴に追加
			if (this.shouldAddToHistoryForStyleEdit(oldValue, newValue)) {
				const stateToSave: MobileHistoryState = { ...this.previousState };
				history.pushState(stateToSave, '', null);

				if (import.meta.env.DEV) {
					console.log(`履歴に追加 (styleEdit): ${newValue} (from ${oldValue})`);
				}
			}
		}
	}

	/**
	 * メニュー変更で履歴に追加すべきかどうかを判断
	 */
	private shouldAddToHistoryForMenu(
		oldValue: MobileActiveMenu,
		newValue: MobileActiveMenu
	): boolean {
		// mapから他のメニューに移動する場合のみ履歴に追加
		return oldValue === 'map' && newValue !== 'map';
	}

	/**
	 * ストリートビュー変更で履歴に追加すべきかどうかを判断
	 */
	private shouldAddToHistoryForStreetView(oldValue: boolean, newValue: boolean): boolean {
		// ストリートビューがtrueになった場合のみ履歴に追加
		return oldValue === false && newValue === true;
	}

	/**
	 * スタイル編集で履歴に追加すべきかどうかを判断
	 */
	private shouldAddToHistoryForStyleEdit(oldValue: boolean, newValue: boolean): boolean {
		// スタイル編集がtrueになった場合のみ履歴に追加
		return oldValue === false && newValue === true;
	}

	/**
	 * popstateイベントハンドラー
	 */
	private handlePopState(event: PopStateEvent): void {
		if (import.meta.env.DEV) {
			console.log('Browser back/forward pressed (mobile)', event.state);
		}

		const currentMenu = get(isActiveMobileMenu);
		const currentStreetView = get(isStreetView);
		const currentStyleEdit = get(isStyleEdit);

		// 1. ストリートビューがtrueの場合は、ストリートビューを終了してmapに戻る
		if (currentStreetView) {
			this.isHandlingPopstate = true;

			isStreetView.set(false);
			isActiveMobileMenu.set('map');

			this.previousState = {
				activeMenu: 'map',
				isStreetView: false,
				isStyleEdit: false,
				timestamp: Date.now()
			};

			if (import.meta.env.DEV) {
				console.log('StreetView ended, returned to map');
			}

			setTimeout(() => {
				this.isHandlingPopstate = false;
			}, 10);
			return;
		}

		// 2. スタイル編集がtrueの場合は、スタイル編集を終了してmapに戻る
		if (currentStyleEdit) {
			this.isHandlingPopstate = true;

			isStyleEdit.set(false);
			isActiveMobileMenu.set('map');

			this.previousState = {
				activeMenu: 'map',
				isStreetView: false,
				isStyleEdit: false,
				timestamp: Date.now()
			};

			if (import.meta.env.DEV) {
				console.log('StyleEdit ended, returned to map');
			}

			setTimeout(() => {
				this.isHandlingPopstate = false;
			}, 10);
			return;
		}

		// 3. 現在mapの場合は通常のブラウザバック処理を継続
		if (currentMenu === 'map') {
			if (import.meta.env.DEV) {
				console.log('Current menu is map, allowing normal browser back');
			}
			return; // 何もしない = 通常のブラウザバック動作
		}

		// 3. map以外のメニューの場合はmapに戻す
		this.isHandlingPopstate = true;

		if (event.state && this.isValidState(event.state)) {
			this.applyStateToStore(event.state as MobileHistoryState);
		} else {
			// 初期状態に戻す（map、ストリートビューoff）
			const mapState: MobileMenuState = {
				activeMenu: 'map',
				isStreetView: false,
				isStyleEdit: false,
				timestamp: Date.now()
			};
			this.applyStateToStore(mapState);
		}

		// 少し遅延してフラグをリセット
		setTimeout(() => {
			this.isHandlingPopstate = false;
		}, 10);
	}

	/**
	 * 状態が有効かどうかを確認
	 */
	private isValidState(state: any): state is MobileHistoryState {
		const validMenus: MobileActiveMenu[] = ['map', 'layer', 'data', 'other'];
		return (
			state &&
			typeof state === 'object' &&
			typeof state.activeMenu === 'string' &&
			validMenus.includes(state.activeMenu as MobileActiveMenu) &&
			typeof state.isStreetView === 'boolean' &&
			typeof state.isStyleEdit === 'boolean'
		);
	}

	/**
	 * 状態をストアに適用
	 */
	private applyStateToStore(state: MobileMenuState | MobileHistoryState): void {
		isActiveMobileMenu.set(state.activeMenu ?? 'map');
		isStreetView.set(state.isStreetView ?? false);

		// previousStateも更新
		this.previousState = {
			activeMenu: state.activeMenu ?? 'map',
			isStreetView: state.isStreetView ?? false,
			isStyleEdit: state.isStyleEdit ?? false,
			timestamp: state.timestamp ?? Date.now()
		};

		if (import.meta.env.DEV) {
			console.log('Mobile menu state applied to store:', state);
		}
	}

	/**
	 * 現在の状態を取得（外部からアクセス可能）
	 */
	public getCurrentState(): Readonly<MobileMenuState> {
		return { ...this.previousState };
	}

	/**
	 * 現在のアクティブメニューを取得
	 */
	public getCurrentMenu(): MobileActiveMenu {
		return get(isActiveMobileMenu);
	}

	/**
	 * mapメニューがアクティブかどうかを確認
	 */
	public isMapActive(): boolean {
		return this.getCurrentMenu() === 'map';
	}

	/**
	 * ストリートビューがアクティブかどうかを確認
	 */
	public isStreetViewActive(): boolean {
		return get(isStreetView);
	}

	public isStyleEditActive(): boolean {
		return get(isStyleEdit);
	}

	/**
	 * 初期化状態を確認
	 */
	public getIsInitialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * クリーンアップメソッド
	 */
	public destroy(): void {
		// すべてのsubscriptionを解除
		this.unsubscribers.forEach((unsubscribe: UnsubscribeFunction) => {
			if (typeof unsubscribe === 'function') {
				unsubscribe();
			}
		});

		// 配列をクリア
		this.unsubscribers = [];

		// popstateリスナーを削除
		window.removeEventListener('popstate', this.handlePopState.bind(this));

		// フラグをリセット
		this.isInitialized = false;

		if (import.meta.env.DEV) {
			console.log('MenuHistoryMobileManager destroyed');
		}
	}
}

if (checkMobile()) {
	new MenuHistoryMobileManager();
} else {
	new MenuHistoryPcManager();
}

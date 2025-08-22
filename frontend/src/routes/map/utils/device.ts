import { showNotification } from '$routes/stores/notification';

/**
 * PWAかどうかを判定する
 * @returns boolean
 * @description PWAかどうかを判定する関数
 */
export const checkPWA = () => {
	return window.matchMedia('(display-mode: standalone)').matches;
};

/**
 * iOS（Safari）かどうかを判定する
 * @returns boolean
 */
export const isIOS = (): boolean => {
	return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * iOSのSafariかどうかを判定する
 * @returns boolean
 */
export const isIOSSafari = (): boolean => {
	const ua = navigator.userAgent;
	return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
};

/**
 * Androidかどうかを判定する
 * @returns boolean
 */
export const isAndroid = (): boolean => {
	return /Android/.test(navigator.userAgent);
};

// PWAインストールを制御
export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{
		outcome: 'accepted' | 'dismissed';
		platform: string;
	}>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const setDeferredPrompt = (prompt: BeforeInstallPromptEvent | null) => {
	deferredPrompt = prompt;
};

/**
 * iOSでのPWAインストール手順を表示する
 */
export const showIOSInstallInstructions = () => {
	const instructions = `
		PWAをインストールするには：
		1. 画面下部の共有ボタン（□↑）をタップ
		2. 「ホーム画面に追加」を選択
		3. 「追加」をタップしてインストール完了
	`;

	showNotification(instructions, 'info');

	// より詳細な手順をモーダルで表示する場合
	// showIOSInstallModal();
};

/**
 * PWAインストールが可能かどうかを判定する
 * @returns boolean
 */
export const canInstallPWA = (): boolean => {
	// すでにPWAとして起動している場合はインストール不要
	if (checkPWA()) {
		return false;
	}

	// AndroidのChrome系ブラウザ
	if (isAndroid() && deferredPrompt) {
		return true;
	}

	// iOSのSafari
	if (isIOSSafari()) {
		return true;
	}

	return false;
};

/**
 * PWAをインストールする関数（iOS対応版）
 */
export const pwaInstall = () => {
	// すでにPWAとして起動している場合
	if (checkPWA()) {
		showNotification('すでにPWAとしてインストールされています。', 'info');
		return;
	}

	// Android Chrome系ブラウザの場合
	if (deferredPrompt && isAndroid()) {
		deferredPrompt.prompt();
		deferredPrompt.userChoice.then((choiceResult) => {
			if (choiceResult.outcome === 'accepted') {
				showNotification('PWAのインストールが開始されました。', 'success');
			}
			deferredPrompt = null;
		});
		return;
	}

	// iOS Safariの場合
	if (isIOSSafari()) {
		showIOSInstallInstructions();
		return;
	}

	// その他のブラウザ
	showNotification(
		'このブラウザではPWAの自動インストールに対応していません。ブラウザの設定から「ホーム画面に追加」を選択してください。',
		'warning'
	);
};

/**
 * PWAインストールボタンを表示するかどうかを判定する
 * @returns boolean
 */
export const shouldShowInstallButton = (): boolean => {
	// すでにPWAとして起動している場合は非表示
	if (checkPWA()) {
		return false;
	}

	return canInstallPWA();
};

// より詳細なiOS用インストール手順モーダルを表示する関数（オプション）
export const showIOSInstallModal = () => {
	// カスタムモーダルを表示する実装
	// 実際のUIフレームワークに合わせて実装してください
	console.log('iOS PWA install modal should be shown here');
};

import { showNotification } from '$routes/stores/notification';

/**
 * PWAかどうかを判定する
 * @returns boolean
 * @description PWAかどうかを判定する関数
 */
export const checkPWA = () => {
	return window.matchMedia('(display-mode: standalone)').matches;
};

// PWAインストールを制御
export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{
		outcome: 'accepted' | 'dismissed';
		platform: string;
	}>;
}

let defferedPrompt: BeforeInstallPromptEvent | null = null;

export const setDeferredPrompt = (prompt: BeforeInstallPromptEvent | null) => {
	defferedPrompt = prompt;
};

/**
 * PWAをインストールする関数
 */
export const pwaInstall = () => {
	if (defferedPrompt) {
		defferedPrompt.prompt();
		defferedPrompt = null;
	} else {
		showNotification(
			'既にインストールされているか、お使いのブラウザが対応していません。ブラウザが対応していない場合は「ホーム画面に追加」からインストールしてください。',
			'error'
		);
	}
};

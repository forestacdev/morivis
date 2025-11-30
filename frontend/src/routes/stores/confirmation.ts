import { writable } from 'svelte/store';

/** 確認ダイアログ */
type ConfirmationDialog = {
	message: string;
	confirmText?: string;
	cancelText?: string;
	confirmOnly?: boolean;
	resolve: (result: boolean) => void;
};

/** 確認ダイアログを表示するストア */
export const confirmationDialog = writable<ConfirmationDialog | null>(null);

/**
 * 確認ダイアログを表示する
 * @param options ダイアログのオプション
 * @returns ユーザーの選択結果のPromise（true: 確認, false: キャンセル）
 */
export const showConfirmDialog = (options: {
	message: string;
	confirmText?: string;
	cancelText?: string;
	confirmOnly?: boolean;
}): Promise<boolean> => {
	return new Promise<boolean>((resolve) => {
		confirmationDialog.set({
			message: options.message,
			confirmText: options.confirmText || 'OK',
			cancelText: options.cancelText || 'キャンセル',
			confirmOnly: options.confirmOnly || false,
			resolve
		});
	});
};

/**
 * 確認ダイアログの結果を処理する
 * @param result ユーザーの選択結果
 */
export const resolveConfirmDialog = (result: boolean) => {
	confirmationDialog.update((dialog) => {
		if (dialog) {
			dialog.resolve(result);
		}
		return null;
	});
};

/**
 * 確認ダイアログを閉じる（キャンセル扱い）
 */
export const closeConfirmDialog = () => {
	resolveConfirmDialog(false);
};

/**
 * レイヤーをリセットする確認ダイアログを表示する
 * @returns ユーザーの選択結果のPromise
 */
export const resetLayersConfirm = (): Promise<boolean> => {
	const message = `現在のレイヤーをすべて初期状態にリセットします。本当によろしいですか？`;

	return showConfirmDialog({
		message,
		confirmText: 'レイヤーをリセット',
		cancelText: 'キャンセル'
	});
};

import type { PhotoLocation } from './formats/exif';

/** アプリ内での確認に同意した場合だけ、ブラウザーの位置情報許可を求める。 */
export const requestPhotoLocation = async (
	confirm: () => Promise<boolean>,
	signal: AbortSignal
): Promise<PhotoLocation | null> => {
	signal.throwIfAborted();
	const accepted = await confirm();
	signal.throwIfAborted();
	if (!accepted) return null;
	if (!navigator.geolocation) {
		throw new Error(
			'この環境では現在地を取得できません。HTTPSで開いているか確認してください。'
		);
	}

	return await new Promise<PhotoLocation>((resolve, reject) => {
		const abort = () => reject(signal.reason);
		signal.addEventListener('abort', abort, { once: true });
		const cleanup = () => signal.removeEventListener('abort', abort);
		try {
			navigator.geolocation.getCurrentPosition(
				({ coords }) => {
					cleanup();
					if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
						reject(new Error('現在地の座標を取得できませんでした。'));
						return;
					}
					resolve({ lat: coords.latitude, lng: coords.longitude });
				},
				(error) => {
					cleanup();
					const messages: Record<number, string> = {
						1: '現在地の利用が許可されていません。端末・ブラウザーの位置情報設定を確認してください。',
						2: '現在地を取得できませんでした。端末の位置情報設定や通信状況を確認してください。',
						3: '現在地の取得がタイムアウトしました。時間をおいてもう一度お試しください。'
					};
					reject(new Error(messages[error.code] ?? '現在地を取得できませんでした。'));
				},
				{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
			);
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
};

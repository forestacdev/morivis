import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPhotoLocation } from './photo-location';

const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>();
beforeEach(() => {
	getCurrentPosition.mockReset();
	vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
});
afterEach(() => vi.unstubAllGlobals());

describe('写真用の現在地取得', () => {
	it('同意前や「いいえ」では位置情報APIを呼ばない', async () => {
		let answer!: (accepted: boolean) => void;
		const pending = requestPhotoLocation(() =>
			new Promise((resolve) => {
				answer = resolve;
			}), new AbortController().signal);
		expect(getCurrentPosition).not.toHaveBeenCalled();
		answer(false);
		expect(await pending).toBeNull();
		expect(getCurrentPosition).not.toHaveBeenCalled();
	});

	it('「はい」の後に取得した端末の座標を返す', async () => {
		getCurrentPosition.mockImplementation((success) =>
			success({ coords: { latitude: 3, longitude: 4 } } as GeolocationPosition)
		);
		expect(await requestPhotoLocation(async () => true, new AbortController().signal)).toEqual({
			lat: 3,
			lng: 4
		});
		expect(getCurrentPosition).toHaveBeenCalledTimes(1);
	});

	it.each([
		[1, '許可されていません'],
		[2, '取得できませんでした'],
		[3, 'タイムアウト']
	])('位置取得エラー %s を利用者に説明する', async (code, message) => {
		getCurrentPosition.mockImplementation((_success, error) =>
			error?.({ code } as GeolocationPositionError)
		);
		await expect(requestPhotoLocation(async () => true, new AbortController().signal)).rejects
			.toThrow(String(message));
	});

	it('未対応環境では取得できない理由を返す', async () => {
		vi.stubGlobal('navigator', {});
		await expect(requestPhotoLocation(async () => true, new AbortController().signal)).rejects
			.toThrow('現在地を取得できません');
	});

	it('確認中にキャンセルされたら同意が返っても位置情報APIを呼ばない', async () => {
		const controller = new AbortController();
		await expect(requestPhotoLocation(async () => {
			controller.abort();
			return true;
		}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
		expect(getCurrentPosition).not.toHaveBeenCalled();
	});

	it('位置取得中のキャンセル後に座標が返っても採用しない', async () => {
		const controller = new AbortController();
		const pending = requestPhotoLocation(async () => true, controller.signal);
		await Promise.resolve();
		controller.abort();
		getCurrentPosition.mock.calls[0][0](
			{ coords: { latitude: 3, longitude: 4 } } as GeolocationPosition
		);
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
	});
});

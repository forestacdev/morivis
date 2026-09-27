import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
import { createRasterGeoRefData } from '../raster/georef';

/** 復号できる先頭フレームを位置合わせ用に取り出す。動画本体はFileのまま保持する。 */
export const readVideoFile = async (file: File, signal: AbortSignal): Promise<GeoRefData> => {
	signal.throwIfAborted();
	if (!file.size) throw new Error('動画ファイルが空です');
	const video = document.createElement('video');
	const url = URL.createObjectURL(file);
	video.muted = true;
	video.playsInline = true;
	video.preload = 'auto';
	try {
		await new Promise<void>((resolve, reject) => {
			const cleanup = () => {
				clearTimeout(timer);
				video.onloadeddata = null;
				video.onerror = null;
				signal.removeEventListener('abort', abort);
			};
			const fail = (error: Error) => {
				cleanup();
				reject(error);
			};
			const abort = () => fail(new DOMException('Aborted', 'AbortError'));
			const timer = setTimeout(
				() => fail(new Error('動画の読み込みが時間内に完了しませんでした')),
				30_000
			);
			video.onloadeddata = () => {
				cleanup();
				resolve();
			};
			video.onerror = () =>
				fail(
					new Error(
						'この動画をブラウザで再生できません。MP4（H.264）やWebMで書き出してお試しください'
					)
				);
			signal.addEventListener('abort', abort, { once: true });
			video.src = url;
			video.load();
		});
		signal.throwIfAborted();
		if (!video.videoWidth || !video.videoHeight) throw new Error('動画に映像がありません');
		const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
		canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
		const context = canvas.getContext('2d');
		if (!context) throw new Error('動画のプレビューを作成できませんでした');
		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
		const bands = [0, 1, 2].map(channel => {
			const band = new Uint8Array(canvas.width * canvas.height);
			for (let i = 0; i < band.length; i++) band[i] = pixels[i * 4 + channel];
			return band;
		});
		return {
			...createRasterGeoRefData({
				entryId: `video_${crypto.randomUUID()}`,
				entryName: file.name.replace(/\.[^.]+$/, ''),
				parsedBands: bands,
				parsedNodata: null,
				dataRanges: bands.map(() => ({ min: 0, max: 255 })),
				imageWidth: canvas.width,
				imageHeight: canvas.height,
				imageFile: file,
				registrationMode: 'raster',
				allowedTransformModes: ['georef'],
				allowRegistrationModeChange: false
			}),
			sourceType: 'video'
		};
	} finally {
		video.pause();
		video.removeAttribute('src');
		video.load();
		URL.revokeObjectURL(url);
	}
};

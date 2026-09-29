import type { MapInfoResult } from '.';
import { convertMapInfoTab } from './convert';

export interface MapInfoRequest {
	files: File[];
	sourceCrs?: string;
}
export type MapInfoResponse = { result: MapInfoResult; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<MapInfoRequest>) => {
	try {
		const result = await convertMapInfoTab(data.files, data.sourceCrs);
		postMessage({ result } satisfies MapInfoResponse);
	} catch (error) {
		const message = error instanceof Error
			? error.message
			: typeof error === 'string'
			? error
			: 'MapInfo TABの読み込みに失敗しました。ファイル一式と形式を確認してください';
		postMessage({ error: message } satisfies MapInfoResponse);
	}
};

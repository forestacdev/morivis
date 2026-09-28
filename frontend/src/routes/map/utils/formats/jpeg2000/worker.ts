import { ensureProjNadgridsReady } from '$routes/map/utils/proj/nadgrid';
import wasmUrl from '@cornerstonejs/codec-openjpeg/decodewasm?url';
import initOpenJpeg from '@cornerstonejs/codec-openjpeg/decodewasmjs';
import { projectRawRaster } from '../envi-bil/project';
import type { RasterGrid } from '../raster/grid';
import { decodeJp2 } from '.';
import type { Jp2Files } from './files';

export type Jp2Request = { type: 'parse'; files: Jp2Files; } | {
	type: 'project';
	grid: RasterGrid;
	crs: string;
};
export type Jp2Response = { result: RasterGrid; } | { error: string; };
self.onmessage = async ({ data }: MessageEvent<Jp2Request>) => {
	try {
		let result: RasterGrid;
		if (data.type === 'parse') {
			const codec = await initOpenJpeg({
				locateFile: () => wasmUrl,
				print: () => {},
				printErr: () => {}
			});
			result = await decodeJp2(data.files, codec);
		} else {
			await ensureProjNadgridsReady(data.crs);
			result = projectRawRaster(data.grid, data.crs);
			// 再投影で有効画素の最小・最大が変わっても、元の画像の色スケールを保つ。
			result.ranges = data.grid.ranges;
		}
		(self as unknown as Worker).postMessage(
			{ result } satisfies Jp2Response,
			result.bands.map(band => band.buffer)
		);
	} catch (cause) {
		postMessage(
			{
				error: cause instanceof Error
					? cause.message
					: 'JPEG2000の復号に失敗しました。破損または未対応の圧縮方式です'
			} satisfies Jp2Response
		);
	}
};

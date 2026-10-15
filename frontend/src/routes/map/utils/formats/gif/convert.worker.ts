import type { FFmpegCoreModuleFactory } from '@ffmpeg/types';
import coreUrl from '@ffmpeg/core?url';
import wasmUrl from '@ffmpeg/core/wasm?url';
import { formatGif } from './definition';
import { inspectGif } from './inspect';

export type GifConversionResponse = { result: ArrayBuffer; } | { error: string; };

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
	try {
		const bytes = new Uint8Array(await file.arrayBuffer());
		inspectGif(bytes);
		// 配布されたES moduleをそのまま読み込み、WASMの場所だけViteのURLで指定する。
		const { default: createCore } = await import(/* @vite-ignore */ coreUrl) as { default: FFmpegCoreModuleFactory; };
		const core = await createCore({
			mainScriptUrlOrBlob: `${coreUrl}#${btoa(JSON.stringify({ wasmURL: new URL(wasmUrl, self.location.href).href }))}`
		});
		core.setLogger(() => {});
		core.setTimeout(formatGif.limits.timeoutMs);
		core.FS.writeFile('input.gif', bytes);
		core.exec(
			'-ignore_loop', '1', '-i', 'input.gif',
			'-filter_complex',
			'[0:v]split[bg][fg];[bg]drawbox=c=white:t=fill:replace=1[white];[white][fg]overlay=shortest=1:format=auto,pad=ceil(iw/2)*2:ceil(ih/2)*2:color=white,format=yuv420p[out]',
			'-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'ultrafast',
			'-crf', '18', '-fps_mode', 'vfr', '-movflags', '+faststart', 'output.mp4'
		);
		if (core.ret !== 0) throw new Error('GIFを動画へ変換できませんでした。ファイルの破損や処理時間の上限を確認してください');
		const output = core.FS.readFile('output.mp4', { encoding: 'binary' });
		if (!(output instanceof Uint8Array) || !output.length) throw new Error('変換後の動画が空です');
		const result = Uint8Array.from(output).buffer;
		(self as unknown as Worker).postMessage({ result } satisfies GifConversionResponse, [result]);
	} catch (cause) {
		postMessage({ error: cause instanceof Error ? cause.message : 'GIFを動画へ変換できませんでした' } satisfies GifConversionResponse);
	}
};

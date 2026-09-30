import { addDecoder } from 'geotiff';

// 各Workerでも、この入口を通して追加デコーダを登録する。
// WASMはZSTD圧縮のブロックを実際に読むまでロードしない。
addDecoder(50000, async () => (await import('./zstd-decoder')).ZstdDecoder);

export { fromArrayBuffer, fromUrl, GeoTIFF } from 'geotiff';

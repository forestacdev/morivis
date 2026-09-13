import { readVectorTileBytes } from '$routes/map/utils/formats/vector-tiles';
import { createLocalTileRegistry } from '../../local-tiles';

export const LOCAL_MVT_PROTOCOL = 'local-mvt';
// MVT/MLT共通のバイト配信。デコード形式はentryから生成するsource.encodingで指定する。
const registry = createLocalTileRegistry(
	LOCAL_MVT_PROTOCOL,
	readVectorTileBytes,
	() => new ArrayBuffer(0)
);
export const registerLocalMvt = registry.register;
export const retainLocalMvtEntry = registry.retain;
export const releaseLocalMvtEntry = registry.release;
export const requestLocalMvt = registry.request;

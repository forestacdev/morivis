import { readMvtBytes } from '$routes/map/utils/formats/mvt';
import { createLocalTileRegistry } from '../../local-tiles';

export const LOCAL_MVT_PROTOCOL = 'local-mvt';
const registry = createLocalTileRegistry(
	LOCAL_MVT_PROTOCOL,
	readMvtBytes,
	() => new ArrayBuffer(0)
);
export const registerLocalMvt = registry.register;
export const retainLocalMvtEntry = registry.retain;
export const releaseLocalMvtEntry = registry.release;
export const requestLocalMvt = registry.request;

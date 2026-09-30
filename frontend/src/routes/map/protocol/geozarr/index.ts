import type { VoxelRegionData, VoxelRegionRequest } from './voxels';
import { PUBLIC_BASE_PATH } from '$env/static/public';
import { getLocalZarrPath, type LocalGeoZarrInput } from '$routes/map/utils/formats/geozarr/local';
import type {
	GeoZarrArrayCandidate,
	GeoZarrRegistrationInput,
	GeoZarrRegistrationMeta
} from './runtime';
import { normalizeGeoZarrUrl } from './url';
export type { GeoZarrArrayCandidate, GeoZarrRegistrationMeta } from './runtime';
export { normalizeGeoZarrUrl } from './url';

type Reply = { id: number; value?: unknown; error?: string; name?: string; };
let worker: Worker | null = null;
let sequence = 0;
const localSources = new Map<string, LocalGeoZarrInput>();
const entrySources = new Map<string, string>();
export const prepareLocalGeoZarr = (files: File[]): string => {
	const url = normalizeGeoZarrUrl(`zarr-local://${crypto.randomUUID()}/`);
	const input: LocalGeoZarrInput = files.length === 1 && /\.zip$/i.test(files[0].name)
		? { type: 'zip', file: files[0] }
		: { type: 'folder', files: files.map(file => ({ path: getLocalZarrPath(file), file })) };
	localSources.set(url, input);
	worker?.postMessage({ type: 'local-source', url, input });
	return url;
};
export const releaseLocalGeoZarr = (url: string) => {
	if ([...entrySources.values()].includes(url)) return;
	localSources.delete(url);
	worker?.postMessage({ type: 'release-local', url });
};
const pending = new Map<
	number,
	{ resolve: (value: unknown) => void; reject: (error: Error) => void; cleanup: () => void; }
>();
const failAll = (error: Error) => {
	for (const request of pending.values()) {
		request.cleanup();
		request.reject(error);
	}
	pending.clear();
};
const getWorker = () => {
	if (worker) return worker;
	const instance = new Worker(new URL('./geozarr.worker.ts', import.meta.url), {
		type: 'module'
	});
	worker = instance;
	for (const [url, input] of localSources) {
		instance.postMessage({ type: 'local-source', url, input });
	}
	instance.onmessage = ({ data }: MessageEvent<Reply>) => {
		const request = pending.get(data.id);
		if (!request) return;
		pending.delete(data.id);
		request.cleanup();
		if (data.error) {
			const error = new Error(data.error);
			error.name = data.name ?? 'Error';
			request.reject(error);
		} else request.resolve(data.value);
	};
	instance.onerror = () => {
		instance.terminate();
		worker = null;
		failAll(new Error('Zarrの処理Workerが停止しました。再度読み込んでください。'));
	};
	return instance;
};
const send = <T>(type: string, payload: unknown, signal?: AbortSignal): Promise<T> => {
	signal?.throwIfAborted();
	const instance = getWorker(), id = ++sequence;
	return new Promise<T>((resolve, reject) => {
		const abort = () => {
			pending.delete(id);
			instance.postMessage({ type: 'cancel', id });
			reject(new DOMException('Request aborted', 'AbortError'));
		};
		pending.set(id, {
			resolve: value => resolve(value as T),
			reject,
			cleanup: () => signal?.removeEventListener('abort', abort)
		});
		signal?.addEventListener('abort', abort, { once: true });
		instance.postMessage({
			type,
			id,
			payload,
			origin: window.location.origin,
			publicEnv: { PUBLIC_BASE_PATH }
		});
	});
};
export const listGeoZarrArrayCandidates = (url: string) =>
	send<GeoZarrArrayCandidate[]>('list', { url });
export const inspectGeoZarr = (url: string, arrayPath?: string, bboxText?: string | null) =>
	send<GeoZarrRegistrationMeta>('inspect', { url, arrayPath, bboxText });
export const registerGeoZarr = async (input: GeoZarrRegistrationInput) => {
	const meta = await send<GeoZarrRegistrationMeta>('register', input);
	if (localSources.has(input.url)) entrySources.set(input.entryId, input.url);
	return meta;
};
export const readGeoZarrVoxelRegion = (input: VoxelRegionRequest, signal: AbortSignal) =>
	send<VoxelRegionData>('voxel-region', input, signal);
export const unregisterGeoZarr = (entryId: string) => {
	if (worker) void send('unregister', { entryId }).catch(() => {});
	const url = entrySources.get(entryId);
	entrySources.delete(entryId);
	if (url) releaseLocalGeoZarr(url);
};
export const geozarrProtocol = (protocolName: 'geozarr') => ({
	protocolName,
	request: (params: { url: string; }, controller: AbortController) =>
		send<{ data: Uint8Array; }>('tile', params, controller.signal),
	cancelAllRequests: () => {
		worker?.terminate();
		worker = null;
		failAll(new DOMException('Request aborted', 'AbortError'));
	}
});

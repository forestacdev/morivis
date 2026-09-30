/// <reference lib="webworker" />
import type { LocalGeoZarrInput } from '$routes/map/utils/formats/geozarr/local';
import {
	configureGeoZarrRuntime,
	geozarrProtocol,
	inspectGeoZarr,
	listGeoZarrArrayCandidates,
	mountLocalGeoZarr,
	readGeoZarrVoxelRegion,
	registerGeoZarr,
	releaseLocalGeoZarr,
	unregisterGeoZarr
} from './runtime';
import type { GeoZarrRegistrationInput } from './runtime';
import type { VoxelRegionData, VoxelRegionRequest } from './voxels';

declare const self: DedicatedWorkerGlobalScope;
const protocol = geozarrProtocol('geozarr');
const requests = new Map<number, AbortController>();
self.onmessage = async (
	{ data }: MessageEvent<
		{
			type: string;
			id: number;
			origin: string;
			publicEnv: Record<string, string | undefined>;
			payload: GeoZarrRegistrationInput;
			url?: string;
			input?: LocalGeoZarrInput;
		}
	>
) => {
	if (data.type === 'local-source' && data.url && data.input) {
		mountLocalGeoZarr(data.url, data.input);
		return;
	}
	if (data.type === 'release-local' && data.url) {
		releaseLocalGeoZarr(data.url);
		return;
	}
	if (data.type === 'cancel') {
		requests.get(data.id)?.abort();
		return;
	}
	configureGeoZarrRuntime(data.origin, data.publicEnv);
	const controller = new AbortController();
	requests.set(data.id, controller);
	try {
		let value: unknown;
		const input = data.payload;
		switch (data.type) {
			case 'list':
				value = await listGeoZarrArrayCandidates(input.url);
				break;
			case 'inspect':
				value = await inspectGeoZarr(input.url, input.arrayPath, input.bboxText);
				break;
			case 'register':
				value = await registerGeoZarr(input);
				break;
			case 'unregister':
				unregisterGeoZarr(input.entryId);
				break;
			case 'voxel-region':
				value = await readGeoZarrVoxelRegion(
					input as unknown as VoxelRegionRequest,
					controller.signal
				);
				break;
			case 'tile':
				value = await protocol.request({ url: input.url }, controller);
				break;
			default:
				throw new Error('不明なZarr処理です');
		}
		controller.signal.throwIfAborted();
		const cells = (value as VoxelRegionData | undefined)?.cells;
		const bytes = (value as { data?: Uint8Array; } | undefined)?.data;
		self.postMessage(
			{ id: data.id, value },
			bytes ? [bytes.buffer as ArrayBuffer] : cells ? [cells.buffer as ArrayBuffer] : []
		);
	} catch (error) {
		self.postMessage({
			id: data.id,
			error: error instanceof Error ? error.message : String(error),
			name: error instanceof Error ? error.name : 'Error'
		});
	} finally {
		requests.delete(data.id);
	}
};

import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_OSM_PBF_BYTES } from './files';

const state = vi.hoisted(() => ({ workers: [] as TestWorker[] }));
interface TestWorker {
	onmessage: ((event: MessageEvent) => void) | null;
	onerror: (() => void) | null;
	onmessageerror: (() => void) | null;
	postMessage: ReturnType<typeof vi.fn>;
	terminate: ReturnType<typeof vi.fn>;
}
vi.mock('./worker?worker', () => ({
	default: class {
		onmessage = null;
		onerror = null;
		onmessageerror = null;
		postMessage = vi.fn();
		terminate = vi.fn();
		constructor() {
			state.workers.push(this);
		}
	}
}));
import { osmFileToGeoJson, OsmParseError } from '../osm';
import { analyzeOsmPbf } from './analyze';

afterEach(() => {
	state.workers.length = 0;
	vi.useRealTimers();
});
const file = () => new File(['test'], 'test-map.osm.pbf');

describe('OSM PBF Workerの終了処理', () => {
	it('結果を返したWorkerを終了する', async () => {
		const promise = analyzeOsmPbf(file(), new AbortController().signal);
		const result = { type: 'FeatureCollection', features: [] };
		state.workers[0].onmessage?.({ data: { result } } as MessageEvent);
		expect(await promise).toEqual(result);
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('キャンセル時にWorkerを終了し、結果を登録させない', async () => {
		const controller = new AbortController();
		const promise = analyzeOsmPbf(file(), controller.signal);
		controller.abort();
		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('タイムアウトでもWorkerを終了する', async () => {
		vi.useFakeTimers();
		const promise = analyzeOsmPbf(file(), new AbortController().signal);
		const rejected = expect(promise).rejects.toThrow('範囲を分割');
		vi.advanceTimersByTime(120_000);
		await rejected;
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('上限超過はWorkerを作る前に拒否する', () => {
		expect(() =>
			analyzeOsmPbf({ size: MAX_OSM_PBF_BYTES + 1 } as File, new AbortController().signal)
		).toThrow('64 MiB');
		expect(state.workers).toHaveLength(0);
	});
	it('既存OSMフォームに解析エラーの内容を渡す', async () => {
		const promise = osmFileToGeoJson(file());
		const rejected = expect(promise).rejects.toThrow(OsmParseError);
		await vi.waitFor(() => expect(state.workers).toHaveLength(1));
		state.workers[0].onmessage?.({ data: { error: 'test-pbf-error' } } as MessageEvent);
		await rejected;
		await expect(promise).rejects.toThrow('test-pbf-error');
	});
});

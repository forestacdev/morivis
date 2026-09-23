import type { Map as MapLibreMap, MapWheelEvent } from '$routes/map/utils/maplibre';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	configureInertialScrollZoom,
	createScrollInputClassifier,
	getScrollZoomDelta,
	getScrollZoomTarget,
	SCROLL_ZOOM_CONFIG,
	scrollZoomEasing
} from './inertial-scroll-zoom';

const wheel = { deltaY: -120, deltaMode: 0, shiftKey: false, ctrlKey: false };

afterEach(() => vi.unstubAllGlobals());

const createMap = () => {
	const handlers = new Map<string, (event: MapWheelEvent) => void>();
	const frames = new Map<number, FrameRequestCallback>();
	let frameId = 0;
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		frames.set(++frameId, callback);
		return frameId;
	});
	vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
	const canvas = {
		clientWidth: 600,
		clientHeight: 600,
		getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 600, height: 600 }))
	};
	const map = {
		scrollZoom: { isEnabled: () => true, disable: vi.fn(), enable: vi.fn() },
		dragPan: { isActive: () => false },
		touchZoomRotate: { isActive: () => false },
		cooperativeGestures: { isEnabled: () => false },
		getCanvas: () => canvas,
		getZoom: () => 10,
		getProjection: vi.fn(() => ({ type: 'mercator' })),
		setTransformCameraUpdate: vi.fn(),
		project: vi.fn(() => ({ x: 20, y: 30 })),
		getMinZoom: () => 0,
		getMaxZoom: () => 25,
		getCenter: () => ({ lng: 0, lat: 0 }),
		unproject: vi.fn(() => ({ lng: 1, lat: 1 })),
		easeTo: vi.fn(),
		isZooming: vi.fn(() => true),
		stop: vi.fn(),
		on: (name: string, handler: (event: MapWheelEvent) => void) => handlers.set(name, handler),
		off: (name: string) => handlers.delete(name)
	};
	const dispose = configureInertialScrollZoom(map as unknown as MapLibreMap);
	const sendWheel = (deltaY: number, ctrlKey = false) => {
		const originalEvent = {
			...wheel,
			deltaY,
			ctrlKey,
			clientX: 20,
			clientY: 30,
			preventDefault: vi.fn()
		};
		handlers.get('wheel')?.(
			{ defaultPrevented: false, originalEvent } as unknown as MapWheelEvent
		);
		return originalEvent;
	};
	const renderFrame = () => {
		for (const [id, callback] of [...frames]) {
			frames.delete(id);
			callback(0);
		}
	};
	const emit = (name: string) => handlers.get(name)?.({} as MapWheelEvent);
	return { map, canvas, frames, sendWheel, renderFrame, emit, dispose };
};

describe('慣性付きスクロールズーム', () => {
	it('入力後も動き続け、同じ時間幅での移動量が徐々に小さくなる', () => {
		const positions = [0, 0.2, 0.4, 0.6, 0.8, 1].map(scrollZoomEasing);
		expect(positions[0]).toBe(0);
		expect(positions.at(-1)).toBe(1);
		const steps = positions.slice(1).map((value, i) => value - positions[i]);
		for (let i = 1; i < steps.length; i++) {
			expect(steps[i]).toBeGreaterThan(0);
			expect(steps[i]).toBeLessThan(steps[i - 1]);
		}
	});

	it('連続入力では残りのズーム量に加算し、逆入力ではすぐ反転する', () => {
		expect(getScrollZoomTarget(10, 10.3, 0.2, 0, 25)).toBeCloseTo(10.5);
		expect(getScrollZoomTarget(10, 10.3, -0.2, 0, 25)).toBeCloseTo(9.8);
	});

	it('ズーム限界と過剰な慣性を制限する', () => {
		expect(getScrollZoomTarget(24.9, 25, 0.5, 0, 25)).toBe(25);
		expect(getScrollZoomTarget(0.1, 0, -0.5, 0, 25)).toBe(0);
		expect(getScrollZoomTarget(10, 11, 100, 0, 25)).toBe(11.5);
	});

	it('高ズームとShiftキーで微調整できる', () => {
		const normal = getScrollZoomDelta(wheel, 10, 600);
		expect(getScrollZoomDelta(wheel, 23, 600)).toBeLessThan(normal);
		expect(getScrollZoomDelta(wheel, 25, 600)).toBeLessThan(getScrollZoomDelta(wheel, 23, 600));
		expect(getScrollZoomDelta({ ...wheel, shiftKey: true }, 10, 600)).toBeLessThan(normal);
	});

	it('行・ページ単位のホイール入力をピクセル相当へ換算する', () => {
		expect(getScrollZoomDelta({ ...wheel, deltaY: -3, deltaMode: 1 }, 10, 600))
			.toBe(getScrollZoomDelta(wheel, 10, 600));
		expect(getScrollZoomDelta({ ...wheel, deltaY: -0.2, deltaMode: 2 }, 10, 600))
			.toBe(getScrollZoomDelta(wheel, 10, 600));
	});

	it('ゼロ・不正入力は無視し、大きな入力でも一度に1ズームを超えない', () => {
		for (const deltaY of [0, NaN, Infinity]) {
			expect(getScrollZoomDelta({ ...wheel, deltaY }, 10, 600)).toBe(0);
		}
		expect(Math.abs(getScrollZoomDelta({ ...wheel, deltaY: 100000 }, 10, 600)))
			.toBeLessThanOrEqual(1);
	});

	it('トラックパッドの加速中も感度を切り替えず、休止後はホイールを再判定する', () => {
		const classify = createScrollInputClassifier();
		expect(classify({ ...wheel, deltaY: -2 }, 0)).toBe('trackpad');
		expect(classify({ ...wheel, deltaY: -12 }, 8)).toBe('trackpad');
		expect(classify({ ...wheel, deltaY: -60 }, 16)).toBe('trackpad');
		expect(classify(wheel, 1000)).toBe('wheel');
		expect(classify(wheel, 1008)).toBe('wheel');
		expect(classify({ ...wheel, deltaY: -4.000244140625 }, 1016)).toBe('wheel');
	});

	it('小さい開始入力がなくても短い間隔の入力をトラックパッドと判定する', () => {
		const classify = createScrollInputClassifier();
		classify({ ...wheel, deltaY: -10 }, 0);
		expect(classify({ ...wheel, deltaY: -12 }, 8)).toBe('trackpad');
		expect(classify({ ...wheel, deltaY: -3, deltaMode: 1 }, 16)).toBe('wheel');
		expect(classify({ ...wheel, ctrlKey: true }, 1000)).toBe('trackpad');
	});

	it('同一フレームの連続入力をまとめ、短い追従時間で一度だけカメラを更新する', () => {
		const { map, canvas, frames, sendWheel, renderFrame } = createMap();
		const events = [-2, -6, -12].map((delta) => sendWheel(delta));
		expect(map.easeTo).not.toHaveBeenCalled();
		expect(frames.size).toBe(1);
		for (const event of events) expect(event.preventDefault).toHaveBeenCalledOnce();
		renderFrame();
		expect(map.easeTo).toHaveBeenCalledOnce();
		expect(canvas.getBoundingClientRect).toHaveBeenCalledOnce();
		const options = map.easeTo.mock.calls[0][0];
		expect(options.duration).toBe(SCROLL_ZOOM_CONFIG.trackpadDuration);
		expect(options.zoom).toBeCloseTo(
			10
				+ events.reduce(
					(sum, event) => sum + getScrollZoomDelta(event, 10, 600, 'trackpad'),
					0
				)
		);
		expect(map.unproject).toHaveBeenCalledWith([20, 30]);
	});

	it('マウスホイールでは既存の慣性時間と感度を保持する', () => {
		const { map, sendWheel, renderFrame } = createMap();
		sendWheel(-120);
		renderFrame();
		expect(map.easeTo.mock.calls[0][0]).toMatchObject({
			duration: SCROLL_ZOOM_CONFIG.duration,
			zoom: 10 + getScrollZoomDelta(wheel, 10, 600),
			easing: scrollZoomEasing
		});
	});

	it('描画前に逆入力されたら、蓄積したズームを捨てて反転する', () => {
		const { map, sendWheel, renderFrame } = createMap();
		sendWheel(-2);
		sendWheel(-12);
		sendWheel(3);
		renderFrame();
		expect(map.easeTo.mock.calls[0][0].zoom).toBeLessThan(10);
	});

	it.each(['mousedown', 'touchstart', 'remove', 'dispose'])(
		'%s で未描画の入力を破棄する',
		(action) => {
			const { map, frames, sendWheel, renderFrame, emit, dispose } = createMap();
			sendWheel(-2);
			if (action === 'dispose') dispose();
			else emit(action);
			expect(frames.size).toBe(0);
			renderFrame();
			expect(map.easeTo).not.toHaveBeenCalled();
		}
	);

	it('グローブでは around を使わず、描画直前の補正を設定する', () => {
		const { map, sendWheel, renderFrame, dispose } = createMap();
		map.getProjection.mockReturnValue({ type: 'globe' });
		sendWheel(-120);
		renderFrame();
		expect(map.stop).toHaveBeenCalledOnce();
		expect(map.easeTo.mock.calls[0][0]).not.toHaveProperty('around');
		expect(map.setTransformCameraUpdate.mock.calls[0][0]).toBeTypeOf('function');
		dispose();
		expect(map.setTransformCameraUpdate).toHaveBeenLastCalledWith(null);
	});

	it('アニメーションが即時完了した場合はズームの残量を持ち越さない', () => {
		const { map, sendWheel, renderFrame } = createMap();
		map.isZooming.mockReturnValue(false);
		sendWheel(-2);
		renderFrame();
		sendWheel(-2);
		renderFrame();
		expect(map.easeTo.mock.calls[1][0].zoom).toBe(map.easeTo.mock.calls[0][0].zoom);
	});
});

import { expect, it, vi } from 'vitest';

import { testCorners } from './__fixtures__/translation';
import { attachGeoRefImageDrag } from './image-drag';

const setup = (panEnabled = true) => {
	const view = new EventTarget();
	let captured: number | null = null;
	const canvas = Object.assign(new EventTarget(), {
		style: { cursor: 'crosshair' },
		ownerDocument: { defaultView: view },
		clientWidth: 200,
		clientHeight: 200,
		getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
		setPointerCapture: (id: number) => {
			captured = id;
		},
		hasPointerCapture: (id: number) => captured === id,
		releasePointerCapture: () => {
			captured = null;
		}
	});
	const pan = {
		isEnabled: () => panEnabled,
		enable: vi.fn(() => {
			panEnabled = true;
		}),
		disable: vi.fn(() => {
			panEnabled = false;
		})
	};
	const map = {
		stop: vi.fn(),
		getCanvas: () => canvas,
		dragPan: pan,
		project: ([x, y]: number[]) => ({ x: 100 + x * 20, y: 100 - y * 20 }),
		unproject: ([x, y]: number[]) => ({ lng: (x - 100) / 20, lat: (100 - y) / 20 })
	} as unknown as Parameters<typeof attachGeoRefImageDrag>[0];
	const translate = vi.fn();
	const dispose = attachGeoRefImageDrag(map, () => testCorners, translate);
	const send = (type: string, values: Partial<PointerEvent> = {}) => {
		const event = Object.assign(new Event(type, { cancelable: true }), {
			clientX: 100,
			clientY: 100,
			pointerId: 1,
			button: 0,
			buttons: 0,
			isPrimary: true,
			...values
		});
		canvas.dispatchEvent(event);
		return event;
	};
	return { canvas, pan, translate, dispose, send, view };
};

it('内側のドラッグを受け取り、外側で離しても地図操作を復元する', () => {
	const { send, pan, translate, canvas, dispose } = setup();
	expect(send('pointerdown').defaultPrevented).toBe(true);
	expect(pan.isEnabled()).toBe(false);
	expect(canvas.style.cursor).toBe('grabbing');
	expect(send('touchstart').defaultPrevented).toBe(true);
	send('pointermove', { clientX: 190, buttons: 1 });
	expect(translate).toHaveBeenCalledTimes(1);
	expect(translate.mock.calls[0][0][0][0]).toBeCloseTo(2.5);
	send('pointerup', { clientX: 220 });
	expect(pan.isEnabled()).toBe(true);
	expect(canvas.style.cursor).toBe('crosshair');
	expect(send('click').defaultPrevented).toBe(true);
	dispose();
});

it('外側・右クリック・修飾キーでは通常の地図操作を妨げない', () => {
	const { send, pan, translate, dispose } = setup();
	for (const values of [{ clientX: 10 }, { button: 2 }, { shiftKey: true }]) {
		expect(send('pointerdown', values).defaultPrevented).toBe(false);
	}
	expect(pan.disable).not.toHaveBeenCalled();
	expect(translate).not.toHaveBeenCalled();
	dispose();
});

it.each(['pointercancel', 'lostpointercapture', 'blur', 'dispose'])(
	'%sでもドラッグ状態を解除する',
	(end) => {
		const { send, pan, view, dispose, canvas } = setup();
		send('pointerdown');
		if (end === 'dispose') dispose();
		else if (end === 'blur') view.dispatchEvent(new Event('blur'));
		else send(end);
		expect(pan.isEnabled()).toBe(true);
		expect(canvas.style.cursor).toBe('crosshair');
		dispose();
		expect(send('pointerdown').defaultPrevented).toBe(false);
	}
);

it('元から無効な地図移動を有効にせず、別の指による移動も混ぜない', () => {
	const { send, pan, translate, dispose } = setup(false);
	send('pointerdown');
	send('pointermove', { pointerId: 2, clientX: 120 });
	expect(translate).not.toHaveBeenCalled();
	send('pointerup');
	expect(pan.enable).not.toHaveBeenCalled();
	dispose();
});

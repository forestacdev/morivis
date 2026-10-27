import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachLongPress } from './long-press';

const touch = (clientX = 20, clientY = 30, identifier = 0) => ({ clientX, clientY, identifier });
const dispatchTouch = (target: EventTarget, type: string, touches = [touch()]) => {
	const event = new Event(type, { cancelable: true });
	Object.defineProperty(event, 'touches', { value: touches });
	target.dispatchEvent(event);
	return event;
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('地図の長押し', () => {
	const setup = () => {
		const element = new EventTarget() as HTMLElement;
		const open = vi.fn();
		return { element, open, interaction: attachLongPress(element, open) };
	};

	it('500msで一度開き、指を離した後のクリックも抑制する', () => {
		const { element, open, interaction } = setup();
		dispatchTouch(element, 'touchstart');
		vi.advanceTimersByTime(499);
		expect(open).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(open).toHaveBeenCalledExactlyOnceWith(touch());
		expect(interaction.shouldSuppressClick()).toBe(true);
		expect(dispatchTouch(element, 'touchend', []).defaultPrevented).toBe(true);
		const click = new Event('click', { cancelable: true });
		element.dispatchEvent(click);
		expect(click.defaultPrevented).toBe(true);
		vi.advanceTimersByTime(800);
		expect(interaction.shouldSuppressClick()).toBe(false);
		interaction.destroy();
	});

	it('短いタップを抑制しない', () => {
		const { element, open, interaction } = setup();
		dispatchTouch(element, 'touchstart');
		vi.advanceTimersByTime(200);
		expect(dispatchTouch(element, 'touchend', []).defaultPrevented).toBe(false);
		vi.advanceTimersByTime(500);
		expect(open).not.toHaveBeenCalled();
		expect(interaction.shouldSuppressClick()).toBe(false);
		interaction.destroy();
	});

	it.each(['touchmove', 'touchcancel', 'multitouch', 'destroy'])(
		'%sで待機中の長押しを取り消す',
		(action) => {
			const { element, open, interaction } = setup();
			dispatchTouch(element, 'touchstart');
			vi.advanceTimersByTime(250);
			if (action === 'multitouch') {
				dispatchTouch(element, 'touchstart', [touch(), touch(50, 50, 1)]);
			} else if (action === 'destroy') interaction.destroy();
			else dispatchTouch(element, action, [touch(40, 30)]);
			vi.advanceTimersByTime(500);
			expect(open).not.toHaveBeenCalled();
			interaction.destroy();
		}
	);

	it('新しいタップは直前の長押しに抑制されない', () => {
		const { element, interaction } = setup();
		dispatchTouch(element, 'touchstart');
		vi.advanceTimersByTime(500);
		dispatchTouch(element, 'touchend', []);
		dispatchTouch(element, 'touchstart');
		expect(interaction.shouldSuppressClick()).toBe(false);
		interaction.destroy();
	});
});

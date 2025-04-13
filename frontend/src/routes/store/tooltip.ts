import { writable } from 'svelte/store';

const createTooltip = () => {
	const { subscribe, set, update } = writable({
		text: '',
		x: 0,
		y: 0,
		visible: false
	});

	return {
		subscribe,

		// 表示
		show(event: MouseEvent, text: string) {
			set({
				text,
				x: event.clientX,
				y: event.clientY,
				visible: true
			});
		},

		// 非表示
		hide() {
			update((t) => ({ ...t, visible: false }));
		}
	};
};

export const tooltip = createTooltip();

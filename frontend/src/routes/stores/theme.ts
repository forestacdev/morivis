import { writable } from 'svelte/store';

type ThemeMode = 'default' | 'preview';

const applyTheme = (mode: ThemeMode) => {
	if (typeof document === 'undefined') return;
	const el = document.documentElement;

	if (mode === 'default') {
		delete el.dataset.theme;
		return;
	}

	el.dataset.theme = mode;
};

const createThemeStore = () => {
	const { subscribe, set } = writable<ThemeMode>('default');

	return {
		subscribe,
		setMode: (mode: ThemeMode) => {
			applyTheme(mode);
			set(mode);
		},
		reset: () => {
			applyTheme('default');
			set('default');
		}
	};
};

export const themeMode = createThemeStore();
export type { ThemeMode };

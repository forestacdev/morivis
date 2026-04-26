import { writable } from 'svelte/store';

type ThemeColors = {
	main: string;
	sub: string;
	subDark: string;
	accent: string;
	mainAccent: string;
	base: string;
};

type ThemeMode = 'default' | 'preview';

const THEMES: Record<ThemeMode, ThemeColors> = {
	default: {
		main: '#0c221d',
		sub: '#495a54',
		subDark: '#1e2124',
		accent: '#59b68e',
		mainAccent: '#348163',
		base: '#f1f1f1'
	},
	preview: {
		main: '#0F0F0F',
		sub: '#495a54',
		subDark: '#1e2124',
		accent: '#59b68e',
		mainAccent: '#348163',
		base: '#f1f1f1'
	}
};

const applyTheme = (colors: ThemeColors) => {
	if (typeof document === 'undefined') return;
	const el = document.documentElement;
	el.style.setProperty('--color-main', colors.main);
	el.style.setProperty('--color-sub', colors.sub);
	el.style.setProperty('--color-sub-dark', colors.subDark);
	el.style.setProperty('--color-accent', colors.accent);
	el.style.setProperty('--color-main-accent', colors.mainAccent);
	el.style.setProperty('--color-base', colors.base);
};

const createThemeStore = () => {
	const { subscribe, set, update } = writable<ThemeMode>('default');

	return {
		subscribe,
		setMode: (mode: ThemeMode) => {
			applyTheme(THEMES[mode]);
			set(mode);
		},
		reset: () => {
			applyTheme(THEMES['default']);
			set('default');
		}
	};
};

export const themeMode = createThemeStore();
export { THEMES };
export type { ThemeMode, ThemeColors };

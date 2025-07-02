import { writable } from 'svelte/store';

export const showLockOnScreen = writable<boolean>(false);

export const transitionPageScreen = writable<1 | 0 | -1>(-1);

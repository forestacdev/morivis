import { writable } from 'svelte/store';

export const showLockOnScreen = writable<boolean>(false);

export const transitionPageScreen = writable<boolean>(false);

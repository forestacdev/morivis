import { writable } from 'svelte/store';

export const isProcessing = writable<boolean>(false);

import { writable } from "svelte/store";


type CursorType = 'default' | 'pointer' | 'text' | 'move' | 'not-allowed';


export const cursorStore = writable<CursorType>('default');

cursorStore.subscribe((cursor) => {
    document.body.style.cursor = cursor;
});
import type { MorivisLayerEntry } from '$routes/map/data/types';
import { createContext } from 'svelte';

// 単一entryの既存bindを保ち、複数entryを生成するフォームから共通プレビューへ渡す。
export const [getUploadPreview, setUploadPreview] = createContext<
	(entries: MorivisLayerEntry[]) => void
>();

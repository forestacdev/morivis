import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
import { writable } from 'svelte/store';

import type { McaWorldPlacement } from './world-placement';

/** ジオリファレンスで確定した配置のみを、同セッションの次のリージョンへ引き継ぐ。 */
export const mcaWorldPlacementStore = writable<McaWorldPlacement | null>(null);

/** Minecraft専用の位置合わせ中だけ使う、グリッド・原点描画用の有効な仮配置。 */
export const mcaGridPreviewStore = writable<MeshEntry<MeshStyle> | null>(null);

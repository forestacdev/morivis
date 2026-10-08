import type { CustomLayerInterface, Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { createLazyResource } from './lazy-resource';

type Manager = { createLayer: () => CustomLayerInterface; dispose: () => void; };

/** 削除・地図破棄・後続更新で失効したロード結果を、地図へ追加しない。 */
export const createLazyMapLayer = <T, M extends Manager>(options: {
	id: string;
	getMap: () => MapLibreMap | null;
	load: () => Promise<M>;
	update: (manager: M, entries: T[]) => void;
	beforeId: (map: MapLibreMap) => string | undefined;
}) => {
	const resource = createLazyResource(options.load);
	let entries: T[] = [];
	let revision = 0;
	const ensure = () => {
		const map = options.getMap();
		const manager = resource.get();
		if (!map || !manager || !entries.length) return;
		const before = options.beforeId(map);
		if (!map.getLayer(options.id)) map.addLayer(manager.createLayer(), before);
		else map.moveLayer(options.id, before);
	};
	const clear = () => {
		revision++;
		entries = [];
		const map = options.getMap();
		if (map?.getLayer(options.id)) map.removeLayer(options.id);
		const manager = resource.get();
		if (manager) {
			options.update(manager, []);
			manager.dispose();
		}
	};
	const set = async (next: T[]) => {
		if (!next.length) {
			clear();
			return;
		}
		const current = ++revision;
		const map = options.getMap();
		if (!map) return;
		const manager = resource.get() ?? await resource.load();
		if (current !== revision || map !== options.getMap()) return;
		entries = next;
		options.update(manager, entries);
		ensure();
	};
	return { set, clear, ensure, get: resource.get };
};

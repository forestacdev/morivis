import { createTyphoonEntry, loadTyphoonEntry } from '$routes/map/api/typhoon';
import type { MorivisLayerEntryCatalogItem } from '$routes/map/data/types';

const catalogItem: MorivisLayerEntryCatalogItem = {
	entry: createTyphoonEntry(),
	loadEntry: loadTyphoonEntry
};
export default catalogItem;

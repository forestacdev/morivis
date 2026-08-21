declare module 'fgdb/lib/read' {
	import type { FeatureCollection } from '$routes/map/types/geojson';

	interface FileGdbCatalogRow {
		Name?: string;
		[key: string]: unknown;
	}

	const read: (
		table: ArrayBuffer | Uint8Array,
		tablex: ArrayBuffer | Uint8Array
	) => FeatureCollection | FileGdbCatalogRow[];

	export default read;
}

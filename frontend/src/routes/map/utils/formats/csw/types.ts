export type CswBbox = [number, number, number, number];
export interface CswLink {
	url: string;
	title: string;
	protocol: string;
	kind: 'wms' | 'wmts' | 'wfs' | 'file' | 'other';
}
export interface CswRecord {
	id: string;
	title: string;
	abstract: string;
	type: string;
	modified: string;
	subjects: string[];
	bbox: CswBbox | null;
	links: CswLink[];
}
export interface CswService {
	title: string;
	url: string;
	recordsUrl: string;
	recordByIdUrl: string;
	typeName: string;
	outputSchema: string;
	detailOutputSchema?: string;
}
export interface CswSearchOptions {
	query?: string;
	bbox?: CswBbox;
	startPosition?: number;
	pageSize?: number;
}
export interface CswSearchResult {
	records: CswRecord[];
	matched: number;
	returned: number;
	nextRecord: number;
}

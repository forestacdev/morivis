export const DEM_DATA_TYPE = {
	mapbox: 0.0,
	gsi: 1.0,
	terrarium: 2.0
} as const;

export type DemDataType = typeof DEM_DATA_TYPE;
export type DemDataTypeKey = keyof DemDataType;

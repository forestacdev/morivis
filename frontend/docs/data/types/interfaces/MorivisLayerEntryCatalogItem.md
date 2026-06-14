[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [data/types](../README.md) / MorivisLayerEntryCatalogItem

# Interface: MorivisLayerEntryCatalogItem

Defined in: [frontend/src/routes/map/data/types/index.ts:148](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L148)

lazy entry を含むカタログ上の 1 件。必要なら loadEntry で完全な entry に解決する。

## Properties

### entry

> **entry**: [`MorivisLayerEntry`](../type-aliases/MorivisLayerEntry.md)

Defined in: [frontend/src/routes/map/data/types/index.ts:149](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L149)

***

### loadEntry()?

> `optional` **loadEntry**: () => `Promise`\<[`MorivisLayerEntry`](../type-aliases/MorivisLayerEntry.md)\>

Defined in: [frontend/src/routes/map/data/types/index.ts:150](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L150)

#### Returns

`Promise`\<[`MorivisLayerEntry`](../type-aliases/MorivisLayerEntry.md)\>

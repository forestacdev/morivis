[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/raster](../README.md) / MorivisRasterEntry

# Type Alias: MorivisRasterEntry\<T\>

> **MorivisRasterEntry**\<`T`\> = [`RasterImageEntry`](../interfaces/RasterImageEntry.md)\<`T`\> \| [`RasterPMTilesEntry`](../interfaces/RasterPMTilesEntry.md)\<`T`\> \| [`RasterMBTilesEntry`](../interfaces/RasterMBTilesEntry.md)\<`T`\> \| [`RasterCogEntry`](../interfaces/RasterCogEntry.md)\<`T`\> \| [`RasterWcsEntry`](../interfaces/RasterWcsEntry.md)\<`T`\> \| [`RasterGeoZarrEntry`](../interfaces/RasterGeoZarrEntry.md)\<`T`\>

Defined in: [frontend/src/routes/map/data/types/raster/index.ts:336](https://github.com/forestacdev/morivis/blob/9a83d67a3be4fb6e2d73e4487a806d84bdbaeb96/frontend/src/routes/map/data/types/raster/index.ts#L336)

morivis の raster 系内部モデル。
配信形式は `format.type`、可視化の種類は `style.type` で表す。

## Type Parameters

### T

`T`

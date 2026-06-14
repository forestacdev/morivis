[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [data/types](../README.md) / MorivisLayerType

# Type Alias: MorivisLayerType

> **MorivisLayerType** = `"raster"` \| `"vector"` \| `"model"` \| `"stylejson"`

Defined in: [frontend/src/routes/map/data/types/index.ts:27](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L27)

morivis が内部で扱うレイヤーの大分類。
`vector / raster / model` は同じ粒度の意味ではなく、
それぞれ geometry / visualization / runtime を主分類軸として持つ。

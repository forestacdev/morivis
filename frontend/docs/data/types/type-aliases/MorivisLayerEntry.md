[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [data/types](../README.md) / MorivisLayerEntry

# Type Alias: MorivisLayerEntry

> **MorivisLayerEntry** = [`AnyRasterEntry`](AnyRasterEntry.md) \| [`AnyVectorEntry`](AnyVectorEntry.md) \| [`MorivisModelEntry`](../model/type-aliases/MorivisModelEntry.md) \| [`StyleJsonEntry`](../stylejson/interfaces/StyleJsonEntry.md)

Defined in: [frontend/src/routes/map/data/types/index.ts:141](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L141)

morivis が UI・ストア・描画変換で共通に扱う内部レイヤーモデル。

これは外部カタログ形式でも、MapLibre / deck.gl / three.js の
生設定オブジェクトでもない。入力形式の違いをいったん吸収し、
描画直前までの標準形として使う。

[**morivis TypeDoc**](../../../../README.md)

***

[morivis TypeDoc](../../../../README.md) / [data/types/vector](../README.md) / TileMetaData

# Interface: TileMetaData

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:49](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/vector/index.ts#L49)

## Extends

- [`BaseMetaData`](../../interfaces/BaseMetaData.md)

## Properties

### attribution

> **attribution**: `AttributionKey`

Defined in: [frontend/src/routes/map/data/types/index.ts:112](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L112)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`attribution`](../../interfaces/BaseMetaData.md#attribution)

***

### bounds

> **bounds**: \[`number`, `number`, `number`, `number`\]

Defined in: [frontend/src/routes/map/data/types/index.ts:117](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L117)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`bounds`](../../interfaces/BaseMetaData.md#bounds)

***

### center?

> `optional` **center**: \[`number`, `number`\]

Defined in: [frontend/src/routes/map/data/types/index.ts:121](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L121)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`center`](../../interfaces/BaseMetaData.md#center)

***

### coverImage?

> `optional` **coverImage**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:118](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L118)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`coverImage`](../../interfaces/BaseMetaData.md#coverimage)

***

### description?

> `optional` **description**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:110](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L110)

「何のデータか」→「どう使うものか」の順で事実ベースで書く。主観的評価や他データとの比較は書かない

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`description`](../../interfaces/BaseMetaData.md#description)

***

### downloadUrl?

> `optional` **downloadUrl**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:111](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L111)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`downloadUrl`](../../interfaces/BaseMetaData.md#downloadurl)

***

### isUserUploaded?

> `optional` **isUserUploaded**: `boolean`

Defined in: [frontend/src/routes/map/data/types/index.ts:123](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L123)

ユーザーがアップロードしたデータかどうか

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`isUserUploaded`](../../interfaces/BaseMetaData.md#isuseruploaded)

***

### location

> **location**: [`Region`](../../location/type-aliases/Region.md)

Defined in: [frontend/src/routes/map/data/types/index.ts:114](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L114)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`location`](../../interfaces/BaseMetaData.md#location)

***

### mapImage?

> `optional` **mapImage**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:119](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L119)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`mapImage`](../../interfaces/BaseMetaData.md#mapimage)

***

### maxZoom

> **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/index.ts:115](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L115)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`maxZoom`](../../interfaces/BaseMetaData.md#maxzoom)

***

### minZoom

> **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/index.ts:116](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L116)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`minZoom`](../../interfaces/BaseMetaData.md#minzoom)

***

### name

> **name**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:107](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L107)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`name`](../../interfaces/BaseMetaData.md#name)

***

### needsLazyHydration?

> `optional` **needsLazyHydration**: `boolean`

Defined in: [frontend/src/routes/map/data/types/index.ts:125](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L125)

lazy entry の fallback など、まだ追加の解決処理が必要な状態かどうか

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`needsLazyHydration`](../../interfaces/BaseMetaData.md#needslazyhydration)

***

### promoteId?

> `optional` **promoteId**: `string`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:50](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/vector/index.ts#L50)

***

### sourceDataName?

> `optional` **sourceDataName**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:108](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L108)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`sourceDataName`](../../interfaces/BaseMetaData.md#sourcedataname)

***

### sourceLayer

> **sourceLayer**: `string`

Defined in: [frontend/src/routes/map/data/types/vector/index.ts:51](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/vector/index.ts#L51)

***

### tags

> **tags**: (`"森林"` \| `"森林歩道"` \| `"林道"` \| `"地図"` \| `"地形"` \| `"田んぼ"` \| `"地質図"` \| `"河川"` \| `"鳥獣保護区"` \| `"道路"` \| `"建物"` \| `"国有林"` \| `"街路樹"` \| `"土壌図"` \| `"微地形図"` \| `"赤色立体地図"` \| `"傾斜区分図"` \| `"傾斜量図"` \| `"基本図"` \| `"背景地図"` \| `"植生図"` \| `"林班"` \| `"小班"` \| `"林相図"` \| `"レーザ林相図"` \| `"単木"` \| `"看板"` \| `"写真"` \| `"地すべり"` \| `"フェノロジー"` \| `"DEM"` \| `"DSM"` \| `"DCHM"` \| `"TWI"` \| `"樹冠高"` \| `"メッシュ"` \| `"10m解像度"` \| `"5m解像度"` \| `"2.5m解像度"` \| `"1m解像度"` \| `"0.5m解像度"` \| `"0.25m解像度"` \| `"地形分類"` \| `"磁気図"` \| `"自然災害伝承碑"` \| `"ハザード"` \| `"洪水"` \| `"高潮"` \| `"津波"` \| `"浸水"` \| `"土砂災害"` \| `"土石流"` \| `"急傾斜地"` \| `"ジオイド高"` \| `"土地被覆"` \| `"樹木被覆率"` \| `"標高段彩図"` \| `"施設平面図"` \| `"CAD"` \| `"点群"` \| `"3Dモデル"` \| `"鳥類"` \| `"登記所備付地図"` \| `"土壌"` \| `"地震"` \| `"曲率"` \| `"樹種"` \| `"気象"` \| `"衛星"` \| `"雨雲"`)[]

Defined in: [frontend/src/routes/map/data/types/index.ts:113](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L113)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`tags`](../../interfaces/BaseMetaData.md#tags)

***

### xyzImageTile

> **xyzImageTile**: [`TileXYZ`](../../raster/interfaces/TileXYZ.md)

Defined in: [frontend/src/routes/map/data/types/index.ts:120](https://github.com/forestacdev/morivis/blob/4017a169afe2022a469d4eca084a3d1959611b00/frontend/src/routes/map/data/types/index.ts#L120)

#### Inherited from

[`BaseMetaData`](../../interfaces/BaseMetaData.md).[`xyzImageTile`](../../interfaces/BaseMetaData.md#xyzimagetile)

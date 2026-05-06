[**morivis TypeDoc**](../../../README.md)

***

[morivis TypeDoc](../../../README.md) / [data/types](../README.md) / BaseMetaData

# Interface: BaseMetaData

Defined in: [frontend/src/routes/map/data/types/index.ts:19](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L19)

## Extended by

- [`TileMetaData`](../vector/interfaces/TileMetaData.md)

## Properties

### attribution

> **attribution**: `AttributionKey`

Defined in: [frontend/src/routes/map/data/types/index.ts:25](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L25)

***

### bounds

> **bounds**: \[`number`, `number`, `number`, `number`\]

Defined in: [frontend/src/routes/map/data/types/index.ts:30](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L30)

***

### center?

> `optional` **center**: \[`number`, `number`\]

Defined in: [frontend/src/routes/map/data/types/index.ts:34](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L34)

***

### coverImage?

> `optional` **coverImage**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:31](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L31)

***

### description?

> `optional` **description**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:23](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L23)

「何のデータか」→「どう使うものか」の順で事実ベースで書く。主観的評価や他データとの比較は書かない

***

### downloadUrl?

> `optional` **downloadUrl**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:24](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L24)

***

### isUserUploaded?

> `optional` **isUserUploaded**: `boolean`

Defined in: [frontend/src/routes/map/data/types/index.ts:36](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L36)

ユーザーがアップロードしたデータかどうか

***

### location

> **location**: [`Region`](../location/type-aliases/Region.md)

Defined in: [frontend/src/routes/map/data/types/index.ts:27](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L27)

***

### mapImage?

> `optional` **mapImage**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:32](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L32)

***

### maxZoom

> **maxZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/index.ts:28](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L28)

***

### minZoom

> **minZoom**: `number`

Defined in: [frontend/src/routes/map/data/types/index.ts:29](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L29)

***

### name

> **name**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:20](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L20)

***

### sourceDataName?

> `optional` **sourceDataName**: `string`

Defined in: [frontend/src/routes/map/data/types/index.ts:21](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L21)

***

### tags

> **tags**: (`"森林"` \| `"森林歩道"` \| `"林道"` \| `"地図"` \| `"地形"` \| `"田んぼ"` \| `"地質図"` \| `"河川"` \| `"鳥獣保護区"` \| `"道路"` \| `"建物"` \| `"国有林"` \| `"街路樹"` \| `"土壌図"` \| `"微地形図"` \| `"赤色立体地図"` \| `"傾斜区分図"` \| `"傾斜量図"` \| `"基本図"` \| `"背景地図"` \| `"植生図"` \| `"林班"` \| `"小班"` \| `"林相図"` \| `"レーザ林相図"` \| `"単木"` \| `"看板"` \| `"写真"` \| `"地すべり"` \| `"フェノロジー"` \| `"DEM"` \| `"DSM"` \| `"DCHM"` \| `"TWI"` \| `"樹冠高"` \| `"メッシュ"` \| `"10m解像度"` \| `"5m解像度"` \| `"2.5m解像度"` \| `"1m解像度"` \| `"0.5m解像度"` \| `"0.25m解像度"` \| `"地形分類"` \| `"磁気図"` \| `"自然災害伝承碑"` \| `"ジオイド高"` \| `"土地被覆"` \| `"樹木被覆率"` \| `"標高段彩図"` \| `"施設平面図"` \| `"CAD"` \| `"点群"` \| `"3Dモデル"` \| `"鳥類"` \| `"登記所備付地図"`)[]

Defined in: [frontend/src/routes/map/data/types/index.ts:26](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L26)

***

### xyzImageTile

> **xyzImageTile**: [`TileXYZ`](../raster/interfaces/TileXYZ.md)

Defined in: [frontend/src/routes/map/data/types/index.ts:33](https://github.com/forestacdev/morivis/blob/bc65177a344b1c607fa81eaf94f6779671c85401/frontend/src/routes/map/data/types/index.ts#L33)

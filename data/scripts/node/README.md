icon から sprite を作成

```
npx mbsprite bundle ../../assets/sprite data/icons data/icons@2x
```

sprites から icon を出力

```
npx mbsprite explode https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std data/icons
npx mbsprite explode http://localhost:9000/data/sprite/sprite data/icons
```

## 注意

- `data/icons/` (1x) と `data/icons@2x/` (2x) の論理サイズを揃えること
- 1xが32pxなら@2xは64px（pixelRatio: 2で論理サイズ32px）

## Tools

- https://github.com/stevage/mbsprite

## Data source

- https://github.com/gsi-cyberjapan/optimal_bvmap/tree/main/sprite
- https://github.com/azavea/texturemap

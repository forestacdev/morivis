# MapLibreの画像ソースのズーム上限

`maplibre-gl@6.4.0.patch` は、画像の範囲から求める内部タイルのズームを `MAX_TILE_ZOOM`（25）までに制限する。小さなDEMや位置合わせ画像では計算結果が26以上となり、`CanonicalTileID` の生成が失敗するため。

画像の四隅、画素、エントリのboundsは変更しない。通常のズーム計算も維持する。TypeScriptの元ソースと、配布されている通常版・開発版のESMに同じ修正を適用する。通常版の差分が大きいのはminifyされた1行を含むためで、変更する式は1箇所のみ。

`pnpm-workspace.yaml` の `patchedDependencies` とルートのlockfileで適用を固定する。MapLibreの更新時は上流の修正状況を確認し、不要になったらパッチを外す。

回帰確認:

```sh
pnpm --dir frontend exec vitest run src/routes/map/utils/map/image-source.spec.ts
```

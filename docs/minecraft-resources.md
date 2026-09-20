# Minecraftの表示素材

利用者は `.mca` だけを読み込む。モデルと画像は `PUBLIC_MINECRAFT_RESOURCE_URL` から自動取得する。
環境変数を空文字にするとローカルの `frontend/static/minecraft/` を使用する。
素材フォルダー全体はGit管理対象外。`manifest.json` の `blockstates` が空なら従来の色付き表示を使う。

配信に使用する素材をプロジェクト内に置き、リポジトリのルートから実行する。

```sh
pnpm --dir frontend minecraft:prepare materials/minecraft.jar 1.21.1
```

`.jar`・`.zip`・展開済みの素材フォルダーに対応。入力パスはリポジトリのルート基準。
`assets` フォルダー自体も指定できる。素材のバージョンは読み込むワールドと合わせる。
事前準備で使うアーカイブ全体を配信する必要はない。

配置されるファイル:

```text
minecraft/
  manifest.json
  assets/<namespace>/blockstates/*.json
  assets/<namespace>/models/**/*.json
  assets/<namespace>/textures/**/*.png
```

元の名前空間・パスを保ち、親モデルやテクスチャ参照を一緒に配置する。
カスタムリソースパックが本体のモデル・画像を参照する場合、素材フォルダーで本体素材に重ねてから実行する。
コマンドは一覧を再生成する。使用しなくなった素材は必要に応じてリポジトリから削除する。
配置後に `.mca` を再読み込みすると反映される。使用画像は読み込み時に共通のテクスチャアトラスへまとめ、GLB内に埋め込まれる。配信側は個別PNGのままでよい。

## CloudFrontからの配信

`frontend/.env.development`・`.env.production`など、使用する環境に設定する。

```env
PUBLIC_MINECRAFT_RESOURCE_URL='https://example.cloudfront.net/minecraft'
```

URL末尾の `/` は省略できる。設定はビルド時に埋め込むため、開発サーバーは再起動、本番は再ビルドする。

S3には `minecraft/manifest.json` と `minecraft/assets/` を配置する。CloudFrontのOrigin pathが空なら、上記URLと一致する。
素材の準備後、AWS CLIで配信先にコピーする例（バケット名は置き換える）:

```sh
aws s3 sync frontend/static/minecraft/ s3://YOUR_BUCKET/minecraft/ --exclude '*.md'
```

CloudFrontにはS3をオリジンとして設定し、OACとバケットポリシーで読み取りを許可する。
別オリジンからのGETには、CloudFrontのレスポンスヘッダーポリシーでCORSを許可する。
確認先は `{PUBLIC_MINECRAFT_RESOURCE_URL}/manifest.json`。403の場合は配置キー・Origin path・読み取り権限を確認する。
更新直後も古い素材や403が返る場合はCloudFrontの対象パスを無効化するか、新しい配信フォルダーに切り替える。

AWS公式: [OACの設定](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)、[レスポンスヘッダーポリシー](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-response-headers-policies.html)。

## 26.3の省略されたブロック状態

26.3ではブロック状態が `id` / `properties` に変わり、初期状態はID文字列だけで保存できる。
初期状態を補う `defaultStates` を `manifest.json` に含める。明示された状態は初期値より優先する。

素材の準備コマンドの後、同じバージョンの [mcmeta blocks summary](https://github.com/misode/mcmeta/tree/26.3-summary/blocks) をプロジェクト内へ取得して実行する。

```sh
curl -fsS https://raw.githubusercontent.com/misode/mcmeta/26.3-summary/blocks/data.json -o .mca-default-states.json
node frontend/scripts/prepare-minecraft-defaults.mjs .mca-default-states.json 26.3
rm .mca-default-states.json
```

素材を再生成した場合は、この初期状態の追加も再実行する。CloudFront利用時は更新した `manifest.json` をアップロードし、必要に応じてキャッシュを無効化する。
状態が不足してモデル候補を選べない場合は、ブロックを消さず従来の色付き形状を使う。

仕様変更: [Minecraft 26.3リリースノート](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-3)。

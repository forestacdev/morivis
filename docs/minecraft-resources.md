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
配置後に `.mca` を再読み込みすると反映される。使用画像はGLB内に埋め込まれる。

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

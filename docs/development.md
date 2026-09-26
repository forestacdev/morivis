# 開発・検証

## セットアップ

リポジトリのルートで実行する。CIは Node.js 24 を使い、pnpm のバージョンはルートの `package.json` の `packageManager` に合わせる。

```sh
pnpm install --frozen-lockfile
cp frontend/.env.example frontend/.env
pnpm dev
```

`.env` がある場合はコピーで上書きせず、必要な項目を追加する。配信先などの環境変数は `frontend/.env.example` を参照する。

`pnpm-workspace.yaml` が `frontend` をワークスペースに含める。依存関係はルートの `pnpm-lock.yaml` で管理し、`frontend` に別のlockfileを作らない。

## 構成

```text
morivis/
├── .github/workflows/       # PRのビルド・lint・テスト
├── frontend/
│   ├── src/
│   │   ├── lib/             # 共通UI、アイコン
│   │   ├── mocks/           # Vitest用の通信モック
│   │   └── routes/
│   │       ├── api/         # 開発用COGプロキシなどのSvelteKitエンドポイント
│   │       ├── stores/      # 地図、レイヤー、UIの状態
│   │       └── map/
│   │           ├── components/  # 地図UI、アップロード、スタイル設定
│   │           ├── data/        # 内部モデルとカタログ
│   │           ├── types/       # UI・入力形式などの型
│   │           ├── protocol/    # タイル取得、Worker、シェーダー
│   │           └── utils/       # formats、proj、sources、layers、描画runtime
│   ├── scripts/             # 素材準備、ビルド補助
│   ├── static/              # 静的アセットと同梱ライブラリ
│   └── e2e/                 # Playwrightの画面・WebGLテスト
├── docs/                    # 設計・開発文書
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

ルートに独立した `api/` や `data/` パッケージはない。データ配信は別リポジトリの [morivis-data](https://github.com/forestacdev/morivis-data) で管理する。

## ローカルの検証

以下はルートから実行できる。

| コマンド | 対象 |
| --- | --- |
| `pnpm --dir frontend check` | SvelteKitの同期、TypeScript・Svelteの診断 |
| `pnpm --dir frontend lint` | dprint、Prettier、ESLint |
| `pnpm --dir frontend exec vitest run` | 単体テストを一度実行 |
| `pnpm --dir frontend test:unit` | 単体テストのwatchモード |
| `pnpm --dir frontend build` | 本番用静的ビルド |
| `pnpm --dir frontend test:e2e` | ビルドしてPlaywrightを実行 |
| `pnpm test` | 単体テスト、ビルド、Playwrightを順に実行 |

小さな修正のたびにフルチェックを繰り返さず、変更箇所に応じた検証を行う。型、Svelteコンポーネント、共有ユーティリティを変更した場合は、最後に `check` を実行する。

ESLintのwarningは終了コードを失敗にしない。lintの通過は、警告がないことを意味しない。同梱ライブラリの `static/basis/`、`static/draco/`、`static/vendor/` はESLintの対象外とし、配布ファイルを直接整形しない。

### Vitest

`frontend/vite.config.ts` の `test.include` が `src/` と `scripts/` の `*.test.*`・`*.spec.*` を収集する。`vitest.setup.ts` はMSWを起動し、未定義の通信をエラーにする。

パーサー、アップロード判定、座標変換、スタイル計算、描画runtimeなどにテストがある。カバレッジ率の閾値は設定していないため、テスト本数から網羅率を推定しない。テスト入力はGit管理された架空のfixtureを使う。

### Playwright

初回はブラウザをインストールする。

```sh
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend test:e2e
```

`playwright.config.ts` が `pnpm run preview` を起動し、本番のbase pathに合わせた `http://127.0.0.1:4173/morivis/` を使う。ポート4173を空けて実行する。ホーム画面の相対URLには `./` を使う。`/` を指定すると `/morivis/` を外れる。

ポートが使用中の場合は `PLAYWRIGHT_PORT=4175` などで変更できる。既存サーバーは再利用せず、テスト対象のビルドを専用サーバーで配信する。

すでにビルドした結果を検証する場合は、ビルドを繰り返さずに実行できる。

```sh
pnpm --dir frontend exec playwright test
```

対象はホーム画面、DEMシェーダー、モデルのモーフ描画。WebGL2が必要で、CIではChromiumを1ワーカーで実行する。失敗時のtraceは `frontend/test-results/` に保存する。ローカルでインストール済みのChromeを使う場合は `PLAYWRIGHT_CHANNEL=chrome` を指定できる。

## CI

| Workflow | 実行する検証 |
| --- | --- |
| `frontend-pull-request-check.yml` | check → lint → build → ChromiumのPlaywrightテスト |
| `frontend-vitest.yml` | Vitestを一度実行 |

両workflowはPRで `frontend/**`、ルートの `package.json`・`pnpm-lock.yaml`・`pnpm-workspace.yaml`・`.npmrc`、または各workflow自身が変わると起動する。ルートの `README.md` や `docs/**` だけの変更では起動しない。

インストールはルートで `pnpm install --frozen-lockfile` を実行し、依存キャッシュもルートのlockfileを参照する。ビルドと単体テストは別ジョブで実行し、Playwrightはビルドジョブの出力を使う。ブラウザテストが失敗した場合は `playwright-results` artifactから結果を確認できる。

## 実装の参照先

- 入力形式の定義: `frontend/src/routes/map/types/index.ts` の `SUPPORTED_UPLOAD_FORMATS`
- ファイル判定: `components/upload/upload-drop.ts` と `upload-drop-matchers.ts`
- フォームの遅延ロード: `components/upload/dialog-registry.ts`
- 座標系選択・位置合わせの許可: `components/upload/transform-policy.ts`
- パーサー: `utils/formats/<format>/`
- CORSプロキシ: `utils/platform/proxy.ts` のルールからVite設定とURL変換を生成

アップロードの状態遷移は [データパイプライン](./data-pipeline.md)、内部モデルと描画系の境界は [内部レイヤーモデル](./architecture/entry-model.md) を参照する。対応形式やファイル規模、テスト件数は変化するため、固定の一覧・自己採点を開発規約に転記しない。

## 描画処理の構成

スタイル生成の入力境界とThree.jsの責務分担は [スタイル生成と3Dモデルの実行時処理](architecture/rendering.md) を参照。

# frontend

リポジトリのルートから実行する。

```sh
pnpm install --frozen-lockfile
cp frontend/.env.example frontend/.env
pnpm dev
```

既存の `.env` は上書きしない。依存関係はルートの `pnpm-lock.yaml` で管理する。

チェック・単体テスト・Playwright・CIの手順は [開発・検証](../docs/development.md) を参照。

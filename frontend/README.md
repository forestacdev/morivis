# frontend

リポジトリのルートから実行する。

```sh
pnpm install --frozen-lockfile
cp frontend/.env.example frontend/.env
pnpm dev
```

既存の `.env` は上書きしない。依存関係はルートの `pnpm-lock.yaml` で管理する。

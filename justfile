docker:
    @docker compose up -d

# 開発サーバーの起動
dev:
    @echo "Checking if port 5173 is in use..."
    @lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
    pnpm dev

# 開発サーバーを起動して Chrome のシークレットを開く
dev-chrome:
    @echo "Checking if port 5173 is in use..."
    @lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
    @(sleep 5; open -na "Google Chrome" --args --incognito http://localhost:5173) &
    pnpm dev

# スマホのサーバーの起動
mobile:
    @echo "Checking ports..."
    @lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
    pnpm mobile

# ビルド
build:
    pnpm run build

# デプロイ
deploy:
    pnpm run deploy

# プレビュー
preview:
    @echo "Checking if port 4173 is in use..."
    @lsof -ti:4173 && echo "Port 4173 is in use, killing process..." && npx kill-port 4173 || echo "Port 4173 is free"
    pnpm run preview

# テスト
test:
    cd frontend && pnpm run test:unit -- --run

test-watch:
    cd frontend && pnpm run test:unit

# フォーマット
format:
    cd frontend && pnpm run format

# リント
lint:
    cd frontend && pnpm run check && pnpm run lint

lint-errors:
    cd frontend && pnpm exec eslint . --quiet

knip:
    cd frontend && pnpm run knip

knip-compact:
    cd frontend && pnpm run knip -- --reporter compact

docs-serve:
    cd frontend && pnpm run docs:serve

# typedocの更新
typedoc:
    cd frontend && pnpm run typedoc

typedoc-markdown:
    cd frontend && pnpm run typedoc:markdown

typedoc-diagram:
    cd frontend && pnpm run typedoc:diagram

typedoc-all:
    just typedoc
    just typedoc-markdown
    just typedoc-diagram

# node_modules含む完全クリア & 再インストール & dev再起動
clean-all:
    @printf "frontend/.svelte-kit, frontend/node_modules/.vite, frontend/node_modules, node_modules を削除します。続けますか? [y/N]: " && read -r confirm && case "$confirm" in [yY]) ;; *) echo "中断しました"; exit 1 ;; esac
    rm -rf frontend/node_modules/.vite
    rm -rf frontend/.svelte-kit
    rm -rf node_modules
    rm -rf frontend/node_modules
    pnpm install
    @echo "完全クリア & 再インストール完了"
    just dev

python-lint: ## Pythonコードのlint自動修正・フォーマット
	cd data/scripts/python && uv run --group dev ruff check --fix . --exclude .venv && uv run --group dev ruff format . --exclude .venv

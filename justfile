docker:
    @docker compose up -d

# 開発サーバーの起動
dev: (_free-port "5173")
    pnpm dev --port 5173 --strictPort

# 開発サーバーを起動して Chrome のシークレットを開く
dev-chrome: (_free-port "5173")
    @(sleep 5; open -na "Google Chrome" --args --incognito http://localhost:5173) &
    pnpm dev --port 5173 --strictPort

# スマホのサーバーの起動
mobile: (_free-port "5173")
    pnpm mobile --port 5173 --strictPort

# ビルド
build:
    pnpm run build

# デプロイ
deploy:
    pnpm run deploy

# プレビュー
preview: (_free-port "4173")
    pnpm run preview --port 4173 --strictPort

_free-port port:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Checking if port {{port}} is in use..."
    for attempt in {0..50}; do
        port_status=0
        port_pids=$(lsof -nP -tiTCP:{{port}} -sTCP:LISTEN) || port_status=$?
        if [ "$port_status" -gt 1 ]; then
            echo "Failed to check port {{port}}" >&2
            exit "$port_status"
        fi
        if [ -z "$port_pids" ]; then
            echo "Port {{port}} is free"
            exit 0
        fi
        if [ "$attempt" -eq 0 ]; then
            echo "Port {{port}} is in use, stopping process..."
            kill $port_pids
        fi
        sleep 0.1
    done
    echo "Port {{port}} is still in use" >&2
    exit 1

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

# 開発サーバーの起動
dev:
    @echo "Checking if port 5173 is in use..."
    @lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
    @lsof -ti:9000 && echo "Port 9000 is in use, killing process..." && npx kill-port 9000 || echo "Port 9000 is free"
    pnpm install
    pnpm dev

# スマホのサーバーの起動
mobile:
    @echo "Checking ports..."
    @lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
    pnpm install
    pnpm mobile

# データのホスティング
host:
    @echo "Checking if port 9000 is in use..."
    @lsof -ti:9000 && echo "Port 9000 is in use, killing process..." && npx kill-port 9000 || echo "Port 9000 is free"
    pnpm install
    pnpm host

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

# リント
lint:
    cd frontend && pnpm run format && pnpm run check && pnpm run lint


# 座標変換
proj:
    cd data/scripts/python && \
    uv sync && \
    source .venv/bin/activate && \
    uv run proj.py && \
    deactivate

# iconからspriteを作成
sprite_bundle:
    cd data/scripts/node && pnpm run sprite:bundle

# uv環境を有効化
uv_activate:
    cd data/scripts/python && \
    uv sync && \
    source .venv/bin/activate

# uv環境を無効化
uv_deactivate:
    cd data/scripts/python && deactivate

# POI、検索データの更新 feature_idを追加
poi_update:
    cd data/scripts/python && \
    ogr2ogr -f GeoJSON -overwrite data/search/fac_poi_with_id.geojson data/search/fac_poi.geojson -lco id_field=id -nln fac_poi && \
    uv run create_poi_search_data.py && \
    uv run icon_image.py && \
    tippecanoe -o ../../assets/entries/pmtiles/vector/fac_search.pmtiles data/search/fac_poi_with_id.geojson --force -l fac_poi && \
    rm data/search/fac_poi_with_id.geojson

# 360度パノラマのデータ更新
update_360:
    cd data/scripts/python && \
    uv run node.py && \
    tippecanoe -o ../../assets/street_view/panorama.pmtiles -L panorama_nodes:../../assets/street_view/nodes.fgb -L panorama_links:../../assets/street_view/links.fgb -ai --force

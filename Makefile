dev: ## 開発サーバーの起動
	@echo "Checking if port 5173 is in use..."
	@lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
	@lsof -ti:9000 && echo "Port 9000 is in use, killing process..." && npx kill-port 9000 || echo "Port 9000 is free"
	pnpm install
	pnpm dev

mobile: ## スマホのサーバーの起動
	@echo "Checking ports..."
	@lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
	pnpm install
	pnpm mobile

host: ## データのホスティング
	@echo "Checking if port 9000 is in use..."
	@lsof -ti:9000 && echo "Port 9000 is in use, killing process..." && npx kill-port 9000 || echo "Port 9000 is free"
	pnpm install
	pnpm host

build: ## ビルド
	pnpm run build

deploy: ## デプロイ
	pnpm run deploy

preview: ## プレビュー
	@echo "Checking if port 4173 is in use..."
	@lsof -ti:4173 && echo "Port 4173 is in use, killing process..." && npx kill-port 4173 || echo "Port 4173 is free"
	pnpm run preview

lint: ## リント
	cd frontend && \
	pnpm run lint

check: ## チェック
	cd frontend && \
	pnpm run check

proj:
	cd data/scripts/python && \
	uv sync && \
	source .venv/bin/activate && \
	uv run proj.py && \
	deactivate

sprite_bundle: # iconからspriteを作成
	cd data/scripts/node && \
	pnpm run sprite:bundle

uv_activate: ## uv環境を有効化
	cd data/scripts/python && \
	uv sync && \
	source .venv/bin/activate

uv_deactivate: ## uv環境を無効化
	cd data/scripts/python && \
	deactivate

# ensyurin_update: ## 演習林のデータ更新
# 	cd data/scripts/python && \
# 	tippecanoe -o ../../assets/entries/pmtiles/vector/ensyurin.pmtiles \
# 	$$(find data/ensyurin -name '*.fgb') --force -z17 -pf -pk -P

poi_update: ## POI、検索データの更新 feature_idを追加
	cd data/scripts/python && \
	ogr2ogr -f GeoJSON -overwrite data/search/fac_poi_with_id.geojson data/search/fac_poi.geojson -lco id_field=id -nln fac_poi && \
	uv run create_poi_search_data.py && \
	uv run icon_image.py && \
	tippecanoe -o ../../assets/entries/pmtiles/vector/fac_search.pmtiles data/search/fac_poi_with_id.geojson --force -l fac_poi && \
	rm data/search/fac_poi_with_id.geojson

360_update: ## 360度パノラマのデータ更新
	cd data/scripts/python && \
	uv run node.py && \
	tippecanoe -o ../../assets/street_view/panorama.pmtiles -L panorama_nodes:../../assets/street_view/nodes.fgb -L panorama_links:../../assets/street_view/links.fgb -ai --force





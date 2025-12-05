dev:
	@echo "Checking if port 5173 is in use..."
	@lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
	@lsof -ti:9000 && echo "Port 9000 is in use, killing process..." && npx kill-port 9000 || echo "Port 9000 is free"
	pnpm install
	pnpm dev

mobile:
	@echo "Checking ports..."
	@lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
	pnpm install
	pnpm mobile

host: ## データのホスティング
	@echo "Checking if port 9000 is in use..."
	@lsof -ti:9000 && echo "Port 9000 is in use, killing process..." && npx kill-port 9000 || echo "Port 9000 is free"
	pnpm install
	pnpm host

build:
	pnpm run build

deploy:
	pnpm run deploy

preview:
		@echo "Checking if port 4173 is in use..."
	@lsof -ti:4173 && echo "Port 4173 is in use, killing process..." && npx kill-port 4173 || echo "Port 4173 is free"
	pnpm run preview

lint:
	cd frontend && \
	pnpm run lint

check:
	cd frontend && \
	pnpm run check

proj:
	cd data/scripts/python && \
	uv sync && \
	source .venv/bin/activate && \
	uv run proj.py && \
	deactivate

sprite_bundle:
	cd data/scripts/node && \
	pnpm run sprite:bundle

uv_activate: ## uv環境を有効化
	cd batch && \
	uv sync && \
	source .venv/bin/activate

uv_deactivate: ## uv環境を無効化
	cd batch && \
	deactivate

ensyurin_update: ## 演習林のデータ更新
	cd batch && \
	tippecanoe -o ../data/entries/pmtiles/vector/ensyurin.pmtiles \
	$$(find data/ensyurin -name '*.fgb') --force -z17 -pf -pk -P

poi_update: ## POI、検索データの更新 feature_idを追加
	cd batch && \
	ogr2ogr -f GeoJSON -overwrite data/search/fac_poi_with_id.geojson data/search/fac_poi.geojson -lco id_field=id -nln fac_poi && \
	uv run scripts/create_poi_search_data.py && \
	uv run scripts/icon_image.py && \
	tippecanoe -o ../data/entries/pmtiles/vector/fac_search.pmtiles data/search/fac_poi_with_id.geojson --force -l fac_poi && \
	rm data/search/fac_poi_with_id.geojson

360_update: ## 360度パノラマのデータ更新
	cd batch && \
	uv run scripts/node.py && \
	tippecanoe -o ../data/street_view/panorama.pmtiles -L panorama_nodes:../data/street_view/nodes.fgb -L panorama_links:../data/street_view/links.fgb -ai --force





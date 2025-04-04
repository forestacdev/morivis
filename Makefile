dev:
	cd frontend && \
	pnpm run dev

360_update: ## データの更新
	cd batch && \
	uv run scripts/node.py && \
	tippecanoe -o ../frontend/static/streetView/THETA360.pmtiles data/THETA360.geojson data/THETA360_line.geojson -ai --force

search_data_update: ## 検索データの更新
	cd batch && \
	uv run scripts/create_search_data.py && \
	tippecanoe -o ../frontend/static/fac_search.pmtiles data/search/fac_building_point.geojson data/search/fac_poi.geojson data/search/fac_ziriki_point.geojson --force





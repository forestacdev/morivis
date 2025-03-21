360_update: ## データの更新
	cd backend && \
	uv run scripts/node.py && \
	tippecanoe -o ../frontend/static/streetView/THETA360.pmtiles data/THETA360.geojson data/THETA360_line.geojson -ai --force




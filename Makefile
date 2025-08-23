dev:
	cd frontend && \
	pnpm run dev

mobile:
	cd frontend && \
	pnpm run mobile

build:
	cd frontend && \
	pnpm run build

deploy:
	cd frontend && \
	pnpm run deploy

preview:
	cd frontend && \
	pnpm run preview

lint:
	cd frontend && \
	pnpm run lint

check:
	cd frontend && \
	pnpm run check

proj:
	cd scripts && \
	uv sync && \
	source .venv/bin/activate && \
	uv run proj.py && \
	deactivate






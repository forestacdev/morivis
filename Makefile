dev:
	@echo "Checking if port 5173 is in use..."
	@lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
	cd frontend && \
	pnpm install && \
	pnpm run dev

mobile:
	@echo "Checking ports..."
	@lsof -ti:5173 && echo "Port 5173 is in use, killing process..." && npx kill-port 5173 || echo "Port 5173 is free"
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






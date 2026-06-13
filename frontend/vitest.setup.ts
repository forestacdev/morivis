import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/mocks/node';

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});

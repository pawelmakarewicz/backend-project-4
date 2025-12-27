install:
	npm ci

lint:
	npx eslint .

test:
	npm run test

test-debug:
	DEBUG=app:* npm run test

test-nock:
	NODE_DEBUG=nock:* npm run test

test-verbose:
	DEBUG=* npm run test
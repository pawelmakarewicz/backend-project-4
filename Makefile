install:
	npm ci
page-loader:
	node bin/page-loader.js
publish:
	npm publish --dry-run
lint:
	npx eslint .
lintfix:
	npx eslint --fix .
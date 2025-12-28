import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import nock from 'nock';
import { fileURLToPath } from 'url';
import pageLoader from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = 'https://ru.hexlet.io/courses';

const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const readFixture = (filename) => fs.readFile(getFixturePath(filename), 'utf-8');

const normalize = (html) => html
  .replace(/\s+/g, ' ')
  .replace(/> </g, '><')
  .trim();

describe('pageLoader', () => {
  let tempDir;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `page-loader-${Date.now()}-`),
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    nock.cleanAll();
  });

  test('should download simple page without resources', async () => {
    const simplePageHtml = await readFixture('simple-page.html');

    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, simplePageHtml);

    const expectedFilePath = path.join(tempDir, 'ru-hexlet-io-courses.html');

    const filePath = await pageLoader({ url, output: tempDir });

    expect(filePath).toBe(expectedFilePath);

    const savedHtml = await fs.readFile(filePath, 'utf-8');
    expect(normalize(savedHtml)).toBe(normalize(simplePageHtml));
  });
  test('should download page with image and transform path', async () => {
    const htmlBefore = await readFixture('page-with-image.html');
    const htmlExpected = await readFixture('page-with-image-expected.html');
    const imageContent = await fs.readFile(getFixturePath('nodejs.png'));

    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, htmlBefore)
      .get('/assets/professions/nodejs.png')
      .reply(200, imageContent);

    await pageLoader({ url, output: tempDir });

    const resourcesDir = path.join(tempDir, 'ru-hexlet-io-courses_files');
    const resourcesDirExists = await fs.access(resourcesDir)
      .then(() => true)
      .catch(() => false);
    expect(resourcesDirExists).toBe(true);

    const savedHtml = await fs.readFile(
      path.join(tempDir, 'ru-hexlet-io-courses.html'),
      'utf-8',
    );
    expect(normalize(savedHtml)).toBe(normalize(htmlExpected));

    const imagePath = path.join(
      resourcesDir,
      'ru-hexlet-io-assets-professions-nodejs.png',
    );
    const imageExists = await fs.access(imagePath)
      .then(() => true)
      .catch(() => false);
    expect(imageExists).toBe(true);

    const imageStats = await fs.stat(imagePath);
    expect(imageStats.size).toBeGreaterThan(0);
  });
  test('should download page with multiple local resources', async () => {
    const htmlBefore = await readFixture('page-with-resources.html');
    const htmlExpected = await readFixture('page-with-resources-expected.html');

    const imageContent = await fs.readFile(getFixturePath('nodejs.png'));
    const cssContent = 'body { background: red; }';
    const scriptContent = 'console.log("hello")';

    nock('https://ru.hexlet.io')
      .get('/courses').times(2).reply(200, htmlBefore)
      .get('/assets/application.css')
      .reply(200, cssContent)
      .get('/packs/js/runtime.js')
      .reply(200, scriptContent)
      .get('/assets/professions/nodejs.png')
      .reply(200, imageContent);

    await pageLoader({ url, output: tempDir });

    const savedHtml = await fs.readFile(
      path.join(tempDir, 'ru-hexlet-io-courses.html'),
      'utf-8',
    );

    expect(normalize(savedHtml)).toBe(normalize(htmlExpected));

    const resourcesDir = path.join(tempDir, 'ru-hexlet-io-courses_files');

    const expectedFiles = [
      'ru-hexlet-io-assets-application.css',
      'ru-hexlet-io-packs-js-runtime.js',
      'ru-hexlet-io-assets-professions-nodejs.png',
    ];

    await Promise.all(expectedFiles.map(async (file) => {
      const p = path.join(resourcesDir, file);
      const exists = await fs.access(p).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }));
  });
  test('should throw error when output directory does not exist', async () => {
    const nonExistentDir = path.join(tempDir, 'non-existent-folder');

    const simplePageHtml = await readFixture('simple-page.html');

    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, simplePageHtml);

    await expect(
      pageLoader({ url, output: nonExistentDir }),
    ).rejects.toThrow();
  });

  test('should throw error when server returns 404', async () => {
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(404, 'Not Found');

    await expect(
      pageLoader({ url, output: tempDir }),
    ).rejects.toThrow();
  });

  test('should throw error when network request fails', async () => {
    nock('https://ru.hexlet.io')
      .get('/courses')
      .replyWithError('Network error');

    await expect(
      pageLoader({ url, output: tempDir }),
    ).rejects.toThrow();
  });

  test('should download page even when some resources fail', async () => {
    const htmlBefore = await readFixture('page-with-resources.html');

    const cssContent = 'body { background: red; }';
    const scriptContent = 'console.log("hello")';

    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, htmlBefore)
      .get('/assets/application.css')
      .reply(200, cssContent)
      .get('/packs/js/runtime.js')
      .reply(200, scriptContent)
      .get('/assets/professions/nodejs.png')
      .reply(404, 'Not Found');

    await pageLoader({ url, output: tempDir });

    const savedHtml = await fs.readFile(
      path.join(tempDir, 'ru-hexlet-io-courses.html'),
      'utf-8',
    );

    // HTML файл должен быть сохранён
    expect(savedHtml).toBeTruthy();

    const resourcesDir = path.join(tempDir, 'ru-hexlet-io-courses_files');

    // CSS и JS должны скачаться
    const successfulFiles = [
      'ru-hexlet-io-assets-application.css',
      'ru-hexlet-io-packs-js-runtime.js',
    ];

    await Promise.all(successfulFiles.map(async (file) => {
      const p = path.join(resourcesDir, file);
      const exists = await fs.access(p).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }));

    // Картинка НЕ должна скачаться
    const failedImagePath = path.join(
      resourcesDir,
      'ru-hexlet-io-assets-professions-nodejs.png',
    );
    const imageExists = await fs.access(failedImagePath)
      .then(() => true)
      .catch(() => false);
    expect(imageExists).toBe(false);
  });
});

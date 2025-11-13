import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import nock from 'nock';
import { fileURLToPath } from 'url';
import pageLoader from '../app.js';

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

    // Настраиваем nock
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, htmlBefore)
      .get('/assets/professions/nodejs.png')
      .reply(200, imageContent);

    await pageLoader({ url, output: tempDir });

    // 1. Проверяем, что папка создалась
    const resourcesDir = path.join(tempDir, 'ru-hexlet-io-courses_files');
    const resourcesDirExists = await fs.access(resourcesDir)
      .then(() => true)
      .catch(() => false);
    expect(resourcesDirExists).toBe(true);

    // 2. Проверяем, что HTML трансформировался правильно
    const savedHtml = await fs.readFile(
      path.join(tempDir, 'ru-hexlet-io-courses.html'),
      'utf-8',
    );
    expect(normalize(savedHtml)).toBe(normalize(htmlExpected));

    // 3. Проверяем, что картинка скачалась
    const imagePath = path.join(
      resourcesDir,
      'ru-hexlet-io-assets-professions-nodejs.png',
    );
    const imageExists = await fs.access(imagePath)
      .then(() => true)
      .catch(() => false);
    expect(imageExists).toBe(true);

    // 4. Проверяем, что картинка не пустая
    const imageStats = await fs.stat(imagePath);
    expect(imageStats.size).toBeGreaterThan(0);

    // 5. Опционально: проверяем, что это та же картинка
    const savedImage = await fs.readFile(imagePath);
    expect(savedImage).toEqual(imageContent);
  });
});

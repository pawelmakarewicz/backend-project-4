import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import nock from 'nock';
import pageLoader from '../app.js';

describe('pageLoader', () => {
  const url = 'https://ru.hexlet.io/courses';
  const mockResponseData = '<html><body>Mocked HTML content</body></html>';

  beforeAll(() => {
    // Ensure nock is active
    nock.disableNetConnect();
  });

  afterAll(() => {
    // Enable network connections for other tests
    nock.enableNetConnect();
  });

  beforeEach(() => {
    // Set up nock to intercept the request and respond with mock data
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, mockResponseData);
  });

  test('should fetch data from URL, save it to a file, and return the file path', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `page-loader-1-${Date.now()}-`));
    const expectedFilePath = path.join(tempDir, 'ru-hexlet-io-courses.html');

    try {
      // Run pageLoader with the temporary directory as output
      const filePath = await pageLoader({ url, output: tempDir });

      // Verify that the returned file path is correct
      expect(filePath).toBe(expectedFilePath);

      // Read the file to verify its contents
      const fileData = await fs.readFile(filePath, 'utf-8');
      expect(fileData).toBe(mockResponseData);
    } finally {
      // Clean up by removing the temp directory and its contents, regardless of test result
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

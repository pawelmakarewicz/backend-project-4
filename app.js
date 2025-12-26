import path from 'path';
import { writeFile, mkdir } from 'node:fs/promises';
import httpClient from './client/client.js';
import {
  createTransformPath,
  transformImagePaths,
  formatUrl,
} from './lib/lib.js';

export default function pageLoader({ url, output }) {
  const outputDir = output || process.cwd();
  let originalPaths;
  let folderName;
  let domain;
  let pathToOutputFile;

  // 1. Скачать файл
  return httpClient
    .get(url)
    .then((data) => {
      // 2. Трансформировать его
      const { domain: d, fullUrl } = formatUrl(url);
      domain = d;
      folderName = `${fullUrl}_files`;

      const transformPath = createTransformPath(folderName, domain);
      const result = transformImagePaths(data, transformPath);

      const { modifiedHtml, originalPaths: ps } = result;
      originalPaths = ps;

      const fileName = `${fullUrl}.html`;
      pathToOutputFile = path.join(outputDir, fileName);
      return writeFile(pathToOutputFile, modifiedHtml);
    })
    .then(() => {
      if (originalPaths.length === 0) {
        console.log('Картинок не найдено, пропускаем скачивание');
        return Promise.resolve();
      }
      // 3. Создать папку
      const folderPath = path.join(outputDir, folderName);
      return mkdir(folderPath, { recursive: true }).then(() => Promise.all(
        originalPaths.map((originalPath) => {
          const fullImageUrl = originalPath.startsWith('http')
            ? originalPath
            : new URL(originalPath, url).href;

          const cleanPath = originalPath.startsWith('/')
            ? originalPath.substring(1)
            : originalPath;
          const imageName = `${domain}-${cleanPath.replace(/\//g, '-')}`;
          const imagePath = path.join(outputDir, folderName, imageName);

          return httpClient
            .getBinary(fullImageUrl)
            .then((imageData) => writeFile(imagePath, imageData))
            .catch((err) => {
              console.log(`Ошибка ${originalPath}:`, err.message);
              return null;
            });
        }),
      ));
    })
    .then(() => {
      console.log(pathToOutputFile);
      return pathToOutputFile;
    })
    .catch((err) => {
      console.error('Ошибка:', err.message);
    });
}

// page-loader.js
import path from 'path';
import { writeFile, mkdir } from 'node:fs/promises';
import httpClient from './client/client.js';
import {
  createTransformPath,
  transformResources,
  formatUrl,
} from './lib/lib.js';

function downloadResource(resourceUrl, resourcePath, originalUrl, resourceType) {
  const downloadMethod = resourceType === 'html'
    ? httpClient.get(resourceUrl)
    : httpClient.getBinary(resourceUrl);

  return downloadMethod
    .then((data) => writeFile(resourcePath, data))
    .then(() => ({ success: true, url: originalUrl }))
    .catch((err) => {
      console.error(`Ошибка загрузки ${originalUrl}:`, err.message);
      return { success: false, url: originalUrl, error: err.message };
    });
}

function downloadAllResources(resources, pageUrl, domain, folderName, outputPath) {
  if (resources.length === 0) {
    console.log('Локальных ресурсов не найдено');
    return Promise.resolve([]);
  }

  const folderPath = path.join(outputPath, folderName);

  return mkdir(folderPath, { recursive: true })
    .then(() => {
      const downloadPromises = resources.map((resource) => {
        const fullUrl = resource.url.startsWith('http')
          ? resource.url
          : new URL(resource.url, pageUrl).href;

        const cleanPath = resource.url.startsWith('/')
          ? resource.url.substring(1)
          : resource.url;

        // Добавляем .html для ресурсов без расширения
        const hasExtension = cleanPath.includes('.') && !cleanPath.endsWith('/');
        let fileNameBase = cleanPath.replace(/\//g, '-');
        if (!hasExtension) {
          fileNameBase = `${fileNameBase}.html`;
        }

        const fileName = `${domain}-${fileNameBase}`;
        const filePath = path.join(outputPath, folderName, fileName);

        return downloadResource(fullUrl, filePath, resource.url, resource.type);
      });

      return Promise.all(downloadPromises);
    });
}

// Основная функция
export default function pageLoader({ url, output }) {
  const outputDir = output || process.cwd();

  return httpClient
    .get(url)
    .then((htmlData) => {
      const { domain, fullUrl } = formatUrl(url);
      const folderName = `${fullUrl}_files`;
      const transformPath = createTransformPath(folderName, domain);

      // Трансформируем ВСЕ ресурсы (img, link, script)
      const { modifiedHtml, resources } = transformResources(
        htmlData,
        url,
        transformPath,
      );

      const fileName = `${fullUrl}.html`;
      const pathToOutputFile = path.join(outputDir, fileName);

      return writeFile(pathToOutputFile, modifiedHtml)
        .then(() => ({
          pathToOutputFile,
          resources,
          pageUrl: url,
          domain,
          folderName,
          outputPath: outputDir,
        }));
    })
    .then((context) => {
      const {
        pathToOutputFile, resources, pageUrl, domain, folderName, outputPath,
      } = context;

      return downloadAllResources(resources, pageUrl, domain, folderName, outputPath)
        .then((results) => {
          const failed = results.filter((r) => !r.success);
          if (failed.length > 0) {
            console.warn(`Не удалось загрузить ${failed.length} ресурсов`);
          }
          const succeeded = results.filter((r) => r.success);
          console.log(`Загружено ресурсов: ${succeeded.length}`);

          return pathToOutputFile;
        });
    })
    .then((pathToOutputFile) => {
      console.log(pathToOutputFile);
      return pathToOutputFile;
    })
    .catch((err) => {
      console.error(err.message);
      throw err;
    });
}

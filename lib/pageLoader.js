import path from 'path';
import { writeFile } from 'node:fs/promises';
import httpClient from '../client/client.js';

function formatUrl(url) {
  // Remove the protocol (http:// or https://)
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '');

  // Replace all dots with hyphens and add .html at the end
  const formattedUrl = `${urlWithoutProtocol
    .replace(/\./g, '-')
    .replace(/\//g, '-')}.html`;

  return formattedUrl;
}

export default function pageLoader({ url, output }) {
  let pathToOutputFile;
  const result = httpClient
    .get(url)
    .then((resData) => {
      const fileName = formatUrl(url);
      pathToOutputFile = path.join(output || process.cwd(), fileName);
      return writeFile(pathToOutputFile, resData);
    })
    .then(() => {
      console.log(pathToOutputFile);
      return pathToOutputFile;
    });
  return result;
}

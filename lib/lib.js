import * as cheerio from 'cheerio';

export function formatUrl(url) {
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
  const [domainPart] = urlWithoutProtocol.split('/');
  const formattedDomain = domainPart.replace(/\./g, '-');
  const formattedFullUrl = urlWithoutProtocol
    .replace(/\./g, '-')
    .replace(/\//g, '-');

  return { domain: formattedDomain, fullUrl: formattedFullUrl };
}

export const createTransformPath = (folderName, domain) => (originalPath) => {
  const cleanPath = originalPath.startsWith('/')
    ? originalPath.substring(1)
    : originalPath;
  const pathWithDashes = cleanPath.replace(/\//g, '-');
  return `${folderName}/${domain}-${pathWithDashes}`;
};

export const transformImagePaths = (htmlData, transformFn) => {
  const $ = cheerio.load(htmlData);
  const originalPaths = [];

  $('img').each((_, el) => {
    const $img = $(el);
    const originalSrc = $img.attr('src');
    if (originalSrc) {
      originalPaths.push(originalSrc);
      const newSrc = transformFn(originalSrc);
      $img.attr('src', newSrc);
    }
  });

  return { originalPaths, modifiedHtml: $.html() };
};

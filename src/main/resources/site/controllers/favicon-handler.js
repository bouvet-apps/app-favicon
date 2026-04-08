const portal = require('/lib/xp/portal');
const cacheLib = require('/lib/cache');

const DEFAULT_TTL = 3600; // 1 hour default if nothing set in siteconfig

const pathSizeMap = {
  'favicon.ico': 32,
  'apple-touch-icon.png': 180,
  'apple-touch-icon-precomposed.png': 180
};

const sizePattern = /apple-touch-icon-(\d+)x\d+/;

let cacheObject = null;

function getRedirectCache(ttl, imageId) {
  if (!cacheObject || cacheObject.ttl !== ttl || cacheObject.imageId !== imageId) {
    cacheObject = {
      ttl: ttl,
      imageId: imageId,
      cache: cacheLib.newCache({
        size: 100,
        expire: ttl || DEFAULT_TTL
      })
    };
  }
  return cacheObject.cache;
}

function getSizeFromPath(path) {
  const match = path.match(sizePattern);
  if (match) {
    return parseInt(match[1], 10);
  }
  const filename = path.split('/').pop();
  return pathSizeMap[filename] || 180;
}

function generateImageUrl(imageId, size) {
  const url = portal.imageUrl({
    id: imageId,
    scale: `square(${size})`,
    format: 'png',
    type: 'absolute'
  });
  const root = portal.pageUrl({
    path: portal.getSite()._path,
    type: 'absolute'
  });
  const rootPart = root.replace(/\/$/, '');
  return url.replace(/(.*)\/_\/image/, rootPart + '/_/image');
}

exports.get = function (req) {
  const siteConfig = portal.getSiteConfig();
  const imageId = siteConfig.favicon;

  if (!imageId) {
    return { status: 404 };
  }

  const size = getSizeFromPath(req.rawPath || req.path);
  const ttl = siteConfig.ttl || DEFAULT_TTL;
  const cacheKey = `favicon-redirect-${size}-${req.host}`;

  let imageUrl;
  if (req.mode === 'live') {
    const cache = getRedirectCache(ttl, imageId);
    imageUrl = cache.get(cacheKey, () => generateImageUrl(imageId, size));
  } else {
    imageUrl = generateImageUrl(imageId, size);
  }

  return {
    status: 301,
    headers: {
      'Location': imageUrl,
      'Cache-Control': `public, max-age=${ttl}`
    }
  };
};

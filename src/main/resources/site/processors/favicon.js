var portal = require('/lib/xp/portal');
var cacheLib = require('/lib/cache');

// Sizes of images generated:
var sizes = [57, 60, 72, 76, 114, 120, 144, 152, 180]; // rel=apple-touch-icon
var altSizes = [16, 32, 96, 192]; // rel=icon
var imageTypes = {
  'png': 'image/png',
  'jpg': 'image/jpg',
  'gif': 'image/gif',
  'jpeg': 'image/jpeg',
  'svg': 'image/svg'
};

exports.responseProcessor = function (req, res) {
  var siteConfig = portal.getSiteConfig();
  var imageId = siteConfig.favicon;
  var domainName = req.host;
  const mode = req.mode;

  if (!imageId) {
    return res;
  }

  var headEnd = res.pageContributions.headEnd;
  if (!headEnd) {
    res.pageContributions.headEnd = [];
  } else if (typeof(headEnd) === 'string') {
    res.pageContributions.headEnd = [headEnd];
  }

  res.pageContributions.headEnd.push(createMetaLinks(siteConfig, domainName, mode));

  return res;
};

function createMetaLink(size, siteConfig, rel, type) {
  var createImageUrl = getCreateImageFn(siteConfig.favicon);
  var imageUrl = createImageUrl('square(' + size + ')', type);
  var mimeType = imageTypes[(type || 'jpg').toLowerCase()];
  var typeStr = mimeType ? 'type="' + mimeType + '"' : '';
  var sizes = 'sizes="' + size + 'x' + size + '" ';
  return '<link rel="' + (rel || 'icon') + '" ' + sizes + 'href="' + imageUrl + '" ' + typeStr + '>';
}

function iconLink(siteConfig) {
  [createMetaLink(64, siteConfig, 'shortcut icon', 'png')]
    .concat(sizes.map(function (size, siteConfig) {
      return createMetaLink(size, siteConfig, 'apple-touch-icon');
    }))
    .concat(altSizes.map(function (size, siteConfig) {
      return createMetaLink(size, siteConfig, 'icon', 'png');
    }))
    .join('\n');
}

function createMetaLinks(siteConfig, domainName, mode) {
  var cache = getCache(siteConfig).cache;

  if (mode === "live") {
    return cache.get('favicon-image-generator-cache-' + domainName, iconLink(siteConfig));
  } else {
      return iconLink(siteConfig);
  }
}

function getCreateImageFn(imageId) {
  return function (scale, format) {
    var url = portal.imageUrl({
      id: imageId,
      scale: scale,
      format: format || 'jpg',
      type: 'absolute'
    });
    var root = portal.pageUrl({
      path: portal.getSite()._path,
      type: 'absolute'
    });
    var rootPart = root[root.length - 1] === '/' ? root.slice(0, -1) : root;
    return url.replace(/(.*)\/_\/image/, rootPart + '/_/image'); // Rewriting url to point to base-url of the app.
  };
}

var cacheObject = null;
function getCache(siteConfig) {
  if (!cacheObject || cacheObject.ttl !== siteConfig.ttl || siteConfig.favicon !== cacheObject.imageId) {
    cacheObject = createCache(siteConfig.ttl, siteConfig.favicon);
  }
  return cacheObject;
}

function createCache(ttl, imageId) {
  return {
    ttl: ttl,
    imageId: imageId,
    cache: cacheLib.newCache({
      size: 100,
      expire: ttl || 300
    })
  };
}

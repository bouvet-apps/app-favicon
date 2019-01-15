var portal = require('/lib/xp/portal');
var cacheLib = require('/lib/xp/cache');

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

var cache = cacheLib.newCache({
    size: 100,
    expire: siteConfig.ttl || 300
});

exports.responseFilter = function (req, res) {
  var siteConfig = portal.getSiteConfig();
  var imageId = siteConfig.favicon;

  if (!imageId) {
    return res;
  }

  var headEnd = res.pageContributions.headEnd;
  if (!headEnd) {
    res.pageContributions.headEnd = [];
  } else if (typeof(headEnd) === 'string') {
    res.pageContributions.headEnd = [headEnd];
  }

  res.pageContributions.headEnd.push(createMetaLinks(siteConfig));

  return res;
};

function createMetaLinks(siteConfig) {
  var createImageUrl = getCreateImageFn(siteConfig.favicon);

  return cache.get('favicon-image-generator-cache', function () {
    return [createMetaLink(64, 'shortcut icon', 'png')]
      .concat(sizes.map(function (size) {
        return createMetaLink(size, 'apple-touch-icon');
      }))
      .concat(altSizes.map(function (size) {
        return createMetaLink(size, 'icon', 'png');
      }))
      .join('\n');
  });

  function createMetaLink(size, rel, type) {
    var imageUrl = createImageUrl('square(' + size + ')', type);
    var mimeType = imageTypes[(type || 'jpg').toLowerCase()];
    var typeStr = mimeType ? 'type="' + mimeType + '"' : '';
    var sizes = 'sizes="' + size + 'x' + size + '" ';
    return '<link rel="' + (rel || 'icon') + '" ' + sizes + 'href="' + imageUrl + '" ' + typeStr + ' />';
  }
}

function getCreateImageFn(imageId) {
  return function (scale, format) {
    var url = portal.imageUrl({
      id: imageId,
      scale: scale,
      format: format || 'jpg'
    });
    var root = portal.pageUrl({
      path: '/'
    });
    return url.replace(/(.*)\/_\/image/, root + '/_/image'); // Rewriting url to point to base-url of the app.
  };
}

/**
 * Created by theroich on 18/5/17.
 */

var request = require('request');
var jar = request.jar();
const cheerio = require('cheerio');
const Lazy = require('lazy.js');
var request = request.defaults({
  jar: jar,
  followAllRedirects: true
});
const Q = require('q');
exports.searchTorrentz2 = function(searchStr) {
  const deferred = Q.defer();
  const option_q = { url: `https://tortorrentz.com/search?q=${searchStr}` };
  request.get(option_q, function(err, resp, html) {
    if (err) deferred.reject(err);
    else deferred.resolve(exports.parseHtmlResponse(html));
  });
  return deferred.promise;
};

function getTrackerStr() {
  const trackers = Lazy([
    'udp://tracker.coppersurfer.tk:6969/announce',
    'udp://tracker.leechers-paradise.org:6969/announce',
    'udp://tracker.zer0day.to:1337/announce',
    'udp://explodie.org:6969/announce',
    'udp://tracker1.wasabii.com.tw:6969/announce',
    'http://173.254.204.71:1096/announce'
  ]);
  const prefix = '&tr=';
  return prefix + trackers.map(encodeURIComponent).join(prefix);
}

const TRACKER_STR = getTrackerStr();

exports.parseHtmlResponse = function(html) {
  var $ = cheerio.load(html);
  const values = Lazy($('dl').get())
    .map(tag => {
      tag.href = $(tag)
        .find('a[href]')
        .attr('href');
      return tag;
    })
    .reject(tag => tag.href === undefined || tag.href.indexOf('?') >= 0)
    .map(extractHtmlData)
    .reject(magnetObj => !magnetObj.seeds)
    .reject(magnetObj => !magnetObj.peers)
    .sortBy('seeds', true)
    .toArray();

  function extractHtmlData(obj) {
    const hash = obj.href.substring(1);

    const cObj = $(obj);
    const ddSpan = cObj.find('dd span');

    const name = cObj.find('a[href]').text();
    const size = $(ddSpan[2]).text();
    const peers = parseInt($(ddSpan[3]).text());
    const seeds = parseInt($(ddSpan[4]).text());
    const magnet = `magnet:?xt=urn:btih:${hash}&dn=${encodeURI(
      name
    )}${TRACKER_STR}`;
    return { magnet, name, size, peers, seeds };
  }
  return values;
};

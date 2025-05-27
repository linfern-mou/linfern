var rule = {
  title: '80s电影网',
  host: 'https://www.80sgod.com/',
  url: '/fyclass/list/----0--p/fypage[/fyclass/list]',
  searchUrl: '/vodsearch/**----------fypage---/',
  class_parse: '#nav li:gt(0):lt(8);a&&Text;a&&href;.*/(.*?)/',
  searchable: 2,
  quickSearch: 0,
  filterable: 0,
  headers: {
    'User-Agent': 'MOBILE_UA',
  },
  play_parse: true,
  lazy: "js:\n  let html = request(input);\n  let hconf = html.match(/r player_.*?=(.*?)</)[1];\n  let json = JSON5.parse(hconf);\n  let url = json.url;\n  if (json.encrypt == '1') {\n    url = unescape(url);\n  } else if (json.encrypt == '2') {\n    url = unescape(base64Decode(url));\n  }\n  if (/\\.(m3u8|mp4|m4a|mp3)/.test(url)) {\n    input = {\n      parse: 0,\n      jx: 0,\n      url: url,\n    };\n  } else {\n    input = url && url.startsWith('http') && tellIsJx(url) ? {parse:0,jx:1,url:url}:input;\n  }",
  limit: 6,
  double: true,
  推荐: '.me1&&li;*;*;*;*;*',
  一级: 'ul.me1,.me3&&li;a&&title;img&&src;.tip&&Text;a&&href',
  二级: {
  title: 'h1&&Text;.span_block:eq(0)&&Text',
  img: '.clearfix img&&src',
  desc: '.info&&span&&Text;.span_block:eq(3)&&Text;.span_block:eq(1)&&Text;.info&&span:eq(3)&&Text;.span_block:eq(2)&&Text',
  content: '#movie_content&&Text',
  tabs: `js:
    TABS = [];
    let cpageItems = pdfa(html, '#cpage li');
    cpageItems.forEach(it => {
      let tabText = pdfh(it, 'span:last-child&&Text').replace(/播放|\\d+$/g, '').trim();
      TABS.push(tabText);
    });
  `,
  lists: `js:
    LISTS = [];
    const dllists = pdfa(html, '.dllist1');
    TABS.forEach((tab, tabIndex) => {
      let currentList = [];
      const listContainer = dllists[tabIndex];
      if (listContainer) {
        if (tab.includes('荐片')) {
          const items = pdfa(listContainer, 'li:has(a)');
          items.forEach(item => {
            const fullText = pdfh(item, 'a&&Text') + pdfh(item, '.dlname&&Text');
            const episode = fullText.match(/第[\\d零一二三四五六七八九十]+集/)?.[0] || '未知集数';
            const url = pd(item, 'a&&href').split('path=')[1];
            if (url) currentList.push(episode + '$' + decodeURIComponent(url));
          });
        } else if (tab.includes('MP4')) {
          const magnetHtml = pdfh(html, '#thunderlinklistcontainer&&Text');
          const magnets = magnetHtml.split('\\n').filter(m => m.startsWith('magnet'));
          magnets.forEach(magnet => {
            const episode = magnet.match(/(\\d+)集/)?.[0] || magnet.match(/(\\d+)\\.mp4/)?.[1] + '集';
            currentList.push('第' + episode + '$' + magnet.trim());
          });
        }
      }
      LISTS.push(currentList);
    });
  `},
  搜索: '*',
}
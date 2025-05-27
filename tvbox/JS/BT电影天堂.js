var rule = {
  title: 'BT电影天堂',
  host: 'http://www.bttt89.com/',
  url: '/listinfo-fyclass-fypage.html[/listinfo-fyclass-0.html]',
  searchUrl: '/e/search/result/index.php?page=fypage&searchid=**',
  class_parse: '.sf-menu li;a&&Text;a&&href;.*/listinfo-(.*?)-0.html',
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
  推荐: '.slider.clearfix;li;a&&title;img&&src;.entry-rating&&Text;a&&href',
  一级: '.post-grid .post;a&&title;img&&src;.entry-meta&&Text;a&&href',
  二级: {
    title: 'h1&&Text;.entry&&br:eq(3)&&Text',
    img: 'img&&src',
    desc: '.entry&&p&&Text',
    content: '#movie_description&&Text',
    tabs1:"js:TABS=['卧龙m3u8']",
    lists1: '#play-list:eq(#id) li',
    tabs:`js:
        TABS=[];
        let hasMagnet = pdfa(html, 'a[href^="magnet:"]').length > 0;
        if (hasMagnet) TABS.push("磁力下载");
    `,
    lists:`js:
LISTS = [];
let list = [];
let seen = {}; // 用于记录已处理的磁力链接，避免重复
// 直接定位所有磁力链接的a标签
let aTags = pdfa(html, 'a[href^="magnet:"]');
aTags.forEach(a => {
    let url = pdfh(a, 'a&&href');
    // 检查链接是否已存在
    if (!seen[url]) {
        seen[url] = true; // 标记为已处理
        let name = pdfh(a, 'a&&Text');
        list.push(name + '$' + url);
    }
});
if (list.length > 0) {
    LISTS.push(list); // 添加去重后的磁力列表
}
`
	},
  搜索: '*',
}
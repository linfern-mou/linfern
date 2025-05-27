var rule = {
  title: '电影天堂[优]',
  host: 'https://www.dytt99.com/',
  url: '/html/page-fyclass-fypage.html[/html/page-fyclass-0.html]',
  searchUrl: '/e/search/result/index.php?page=fypage&searchid=**',
  class_parse: '.nav li;a&&Text;a&&href;.*/page-(.*?)-0.html',
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
  推荐: '.ul-imgtxt1;li;img&&alt;img&&src;.txt&&Text;a&&href',
  一级: 'ul.row li;h3&&Text;img&&src;span&&Text;a&&href',
  二级: {
    title: 'h1&&Text;.txt p:eq(5)&&Text',
    img: 'img&&src',
    desc: '.txt p:eq(8)&&Text;.txt p:eq(3)&&Text;.txt p:eq(4)&&Text;.txt p:eq(5)&&Text;.txt p:eq(14)&&Text;.txt p:eq(16)&&Text',
    content: '.txt p:eq(-3)&&Text',
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
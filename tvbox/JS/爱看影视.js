var rule = {
    title: 'AKY影视',
    host: 'https://www.akysw.pro/',
    url: 'https://www.akysw.pro/type/fyclass-fypage.html',
    searchUrl: 'https://www.akysw.pro/search/**----------fypage---.html',
    searchable: 2, // 启用全局搜索
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'UC_UA', // 模拟UC浏览器访问
        'Referer': 'https://www.akysw.pro/' // 添加Referer头
    },
    class_parse: '.nav-menu li:gt(0):lt(8);a&&Text;a&&href;.*/(.*?).html', // 导航分类解析
    play_parse: true,
    lazy: `js:
            if(/\\.(m3u8|mp4)/.test(input)){
                input = {parse:0,url:input}
            } else {
                let purl = rule.parse_url.replace('json:','')+input;
                let html = request(purl);
                input = {parse:0,url:JSON.parse(html).url}
            }
            `,
    limit: 8,
    推荐: '.hot-list;li;a&&title;.lazyload&&data-original;.desc&&Text;a&&href',
    double: true,
    一级: '.hot-list li;a&&title;a&&data-original;.desc&&Text;a&&href',
    二级: {
        "title": "h1&&Text",
        "img": ".thumb img&&src",
        "desc": ".detail p:eq(0)&&Text;.detail p:eq(1)&&Text;.detail p:eq(2)&&Text",
        "content": ".content-text&&Text",
        "tabs": ".tab-nav li",
        "lists": ".play-list li"
    },
    搜索: '.search-result;a&&title;.lazyload&&data-original;.desc&&Text;a&&href;.info p&&Text',
}

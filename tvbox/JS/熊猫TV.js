var rule = {
    title: '熊猫tv',
    host: 'https://spiderscloudcn2.51111666.com',
    url: '/forward', // API 接口路径
    filter_url: 'typeId={{fl.typeId}}&typeMid={{fl.typeMid}}', // 动态参数替换
    filter: {
        "分类": [{
            key: "typeId",
            name: "类型",
            value: [
                { n: "全部", v: "" },
                { n: "国剧", v: "22" }, // 示例 typeId
                { n: "日韩剧", v: "33" },
                { n: "欧美剧", v: "44" }
            ]
        }]
    },
    searchUrl: '/forward', // 搜索接口
    searchable: 2, // 支持搜索
    quickSearch: 0, // 不支持快速搜索
    filterable: 1, // 支持筛选
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; M2006J10C Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.129 Mobile Safari/537.36',
        'Origin': 'https://www.kkqqkk.com',
        'Referer': 'https://www.kkqqkk.com/',
        'Content-Type': 'application/json'
    },
    timeout: 5000, // 超时时间
    class_parse: '#menus&&li:gt(1);a&&Text;a&&href;.*/(.*)/', // 分类解析规则（需根据实际页面调整）
    cate_exclude: '欧美剧|旧版6v', // 排除分类
    play_parse: true, // 支持播放解析
    limit: 6, // 每页数据量
    推荐: '*', // 推荐内容选择器
    一级: '#post_container&&li;h2&&Text;img&&src;.info_date&&Text;a&&href', // 一级列表解析规则
    二级: {
        "title": "#content&&h1&&Text;.info_category&&Text", // 标题解析
        "img": "#post_content&&img&&src", // 封面图解析
        "desc": ";;;#post_content&&p:eq(0)&&Text;#post_content&&p:eq(2)&&Text", // 描述解析
        "content": "#post_content&&p:eq(1)&&Text", // 内容解析
        "tabs": `js:
            TABS = ["道长磁力"];
            let tabs = pdfa(html, '#content&&h3:not(:contains(网盘))');
            tabs.forEach((it) => {
                TABS.push(pdfh(it, "body&&Text").replace('播放地址','道长在线').replace('（无插件 极速播放）','一').replace('（无需安装插件）','二'))
            });
        `, // 播放标签解析
        "lists": `js:
            log(TABS);
            pdfh=jsp.pdfh;pdfa=jsp.pdfa;pd=jsp.pd;
            LISTS = [];
            let i = 1;
            TABS.forEach(function(tab) {
                if (/道长磁力/.test(tab)) {
                    var d = pdfa(html, '.context&&td');
                    d = d.map(function(it) {
                        var title = pdfh(it, 'a&&Text');
                        var burl = pd(it, 'a&&href');
                        return title + '$' + burl
                    });
                    LISTS.push(d)
                } else if (/道长在线/.test(tab) && i <= TABS.length-1) {
                    var d = pdfa(html, '.context&&.widget:eq(list_idx)&&a'.replace("list_idx", i));
                    d = d.map(function(it) {
                        var title = pdfh(it, 'a&&Text');
                        var burl = pd(it, 'a&&href');
                        return title + '$' + burl
                    });
                    LISTS.push(d)
                    i = i + 1;
                }
            });
        ` // 播放列表解析
    },
    搜索: '*',
    // 自定义 POST 请求参数
    post_params: {
        "command": "WEB_GET_INFO", // 固定命令
        "pageNumber": "{{pg}}", // 动态页码
        "RecordsPage": 20, // 每页记录数
        "typeId": "{{fl.typeId}}", // 类型ID
        "typeMid": "{{fl.typeMid}}", // 子类型ID
        "languageType": "CN", // 语言类型
        "content": "" // 搜索内容
    }
};
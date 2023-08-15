var rule ={
            title: '258',
            host: 'https://258.tv',
            // homeUrl:'/',
            url: '/film/fyclass/fypage[firstPage=https://258.tv/film/{fyclass}/]',
            searchUrl: '/Search/?searchphrase=all&searchword=**',
            searchable: 1,//是否启用全局搜索,
            quickSearch: 1,//是否启用快速搜索,
            filterable: 0,//是否启用分类筛选,
            headers: {//网站的请求头,完整支持所有的,常带ua和cookies
                'User-Agent': 'MOBILE_UA',
                // "Cookie": "searchneed=ok"
            },
            class_name:'720P/1080P蓝光电影&3D电影&蓝光原盘&蓝光电影',
    class_url:'720p-1080p&3d-blu-ray&blu-raydisc&Bluray',
            play_parse: true,
            lazy: '',
            limit: 6,
            推荐: '.teaser-item;a&&title;img&&src;div&&p&&Text;a&&href',
            double: true, // 推荐内容是否双层定位
            一级: '.pic-list&&li;a&&title;img&&src;h2&&Text;a&&href',
            二级: {
                "title": "h1&&Text;.content-rt&&p:eq(0)&&Text",
                "img": ".img&&img&&data-src",
                "desc": ".content-rt&&p:eq(1)&&Text;.content-rt&&p:eq(2)&&Text;.content-rt&&p:eq(3)&&Text;.content-rt&&p:eq(4)&&Text;.content-rt&&p:eq(5)&&Text",
                "content": ".zkjj_a&&Text",
                "tabs": ".py-tabs&&option",
                "lists": ".player:eq(#id) li"
            },
            搜索: '.sr_lists&&ul&&li;h3&&Text;img&&data-src;.int&&p:eq(0)&&Text;a&&href',
        }
var rule = {
    类型:'影视',
    title:'子子影视',
    author:'不告诉你',
    desc:'不告诉你',
    host:'https://ziziys.info',
    hostJs: async function () {
        let HOST = this.HOST;
        let html = await request(HOST, {headers: {'User-Agent': 'PC_UA'}});HOST = jsp.pdfh(html,'ul&&li:eq(0) a&&href');return HOST;},
    logo:'https://i-blog.csdnimg.cn/blog_migrate/2621e710a94ab40ba66645d47f296aaf.gif',
    url: '/vodshow/fyclass--------fypage---.html',
    searchUrl: '/vsearch/--.html?wd=**',
    searchable:1,quickSearch:1,double:false,timeout:5000,play_parse:true,filterable:1,invalid:true,
    class_name:'电影&电视剧&动漫',
    class_url:'/1&2&3',
    //filter_url:'{{fl.area}}{{fl.class}}{{fl.cateId}}/page/fypage{{fl.year}}',filter_def:{'/id/61':{cateId:'/id/61'},'/id/79':{cateId:'/id/79'},'/id/88':{cateId:'/id/88'},'/id/93':{cateId:'/id/93'},'/id/99':{cateId:'/id/99'}},
    预处理: async () => {return []},
    推荐: async function (tid, pg, filter, extend) {
        let homeFn = rule.一级.bind(this);
        return await homeFn();
    },
    一级: async function (tid, pg, filter, extend) {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let d = [];
        let data = pdfa(html, '.module-items .module-item');
        data.forEach((it) => {
            d.push({
                title: pdfh(it, 'a&&title'),
                pic_url: pd(it, 'img&&data-src'),
                desc: pdfh(it, '.module-item-text&&Text'),
                url: pd(it, 'a&&href'),
            })
        });
        return setResult(d)
    },
    二级: async function (ids) {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let VOD = {};
        VOD.vod_name = pdfh(html, 'h1&&Text');//名称
        VOD.vod_actor = pdfh(html, '.video-info-items:eq(1)&&Text');//演员
        VOD.vod_director = pdfh(html, '.video-info-items:eq(0)&&Text');//导演
        VOD.vod_remarks = pdfh(html, '');//备注
        VOD.vod_status = pdfh(html, '');//状态
        VOD.vod_content = pdfh(html, '.video-info-content&&Text');//简介
        let playlist = pdfa(html, '.module-list');
        let tabs = pdfa(html, '.module-tab&&.module-tab-item.tab-item');
        let playmap = {};
        tabs.map((item, i) => {
            const form = pdfh(item, 'span&&Text');
            const list = playlist[i];
            const a = pdfa(list, 'body&&a:not(:contains(排序))');
            a.map((it) => {
                let title = pdfh(it, 'a&&Text');
                let urls = pd(it, 'a&&href', input);
                if (!playmap.hasOwnProperty(form)) {
                    playmap[form] = [];
                }
                playmap[form].push(title + "$" + urls);
            });
        });
        VOD.vod_play_from = Object.keys(playmap).join('$$$');
        const urls = Object.values(playmap);
        const playUrls = urls.map((urllist) => {
            return urllist.join("#");
        });
        VOD.vod_play_url = playUrls.join('$$$');
        return VOD;
    },
    搜索: async function (wd, quick, pg) {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let d = [];
        let data = pdfa(html, '.module-items .module-search-item');
        data.forEach((it) => {
            d.push({
                title: pdfh(it, 'a&&title'),
                pic_url: pd(it, 'img&&data-src'),
                desc: pdfh(it, '.video-serial&&Text'),
                url: pd(it, 'a&&href'),
                content: pdfh(it, '.video-info-aux&&Text'),
            })
        });
        return setResult(d);
    },
    /*lazy: async function (flag, id, flags) {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        html = JSON.parse(html.match(/r player_.*?=(.*?)</)[1]);
        let url = html.url;
        if (html.encrypt == "1") {
            url = unescape(url)
            return {parse: 0, url: url}
        } else if (html.encrypt == "2") {
            url = unescape(base64Decode(url))
            return {parse: 0, url: url}
        }
        if (/m3u8|mp4/.test(url)) {
             input = url
             return {parse: 0, url: input}
         } else {
             return {parse: 0, url: input}
         }
    },*/
lazy: async function (flag, id, flags) {
    let { input, pdfa, pdfh, pd } = this;
    let html = await request(input);
    let iframeSrc = html.match(/<iframe[^>]+id=['"]?player_if['"]?[^>]*src=['"]([^'"]+)/i)?.[1];
    if (!iframeSrc) throw new Error("无法定位播放器iframe");
    
    // 2. 构建完整播放器URL
    let playUrl = new URL(iframeSrc, input).href;
    
    // 3. 请求播放器页面（携带必要请求头）
    let iframeHtml = await request(playUrl, {
        headers: {
            Referer: input,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    });
    
    // 3. 提取加密配置（改进版正则表达式）
    let jsPattern = /(player_config|h5player_options)\s*=\s*({[\s\S]*?})\s*;/;
    let jsonData = iframeHtml.match(jsPattern)?.[2] || '{}'; 
    let playerConfig = JSON.parse(jsonData);
    
    // 4. 解密处理（增强容错机制）
    let realUrl = playerConfig.url || '';
    switch(String(playerConfig.encrypt)) { // 强制转字符串处理
        case '1': 
            realUrl = decodeURIComponent(realUrl);
            break;
        case '2':
            realUrl = atob(realUrl.split('_')[1]); // 处理常见base64分段加密
            break;
        case '3':
            realUrl = realUrl.split('').reverse().join('').replace(/^#+/, '');
            break;
        default:
            // 备用方案：从video标签提取
            let videoMatch = iframeHtml.match(/<video[^>]+src=['"](.*?)['"]/);
            if(videoMatch) realUrl = videoMatch[1];
    }
    
    // 5. 自动补全相对路径并验证协议
    if(!realUrl.match(/^(http|https|ftp):\/\//)) {
        realUrl = new URL(realUrl, playUrl).href;
    }
    
    // 6. 返回处理结果
    return {
        parse: /\.(m3u8|mp4)(\?|$)/i.test(realUrl) ? 1 : 0,
        jx: 0,
        url: realUrl,
        header: { // 增加必要请求头
            Referer: playUrl,
            Origin: new URL(playUrl).origin
        }
    };
},
}
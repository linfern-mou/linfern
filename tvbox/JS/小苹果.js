var rule = {
    title: 'xpg',
    host: 'http://item.xpgtv.xyz',
    url: '/api.php/v2.vod/androidfilter10086?page=fypage&type=fyclass',
    detailUrl: "http://item.xpgtv.xyz/api.php/v3.vod/androiddetail2?vod_id=fyid",
    homeUrl: "/api.php/v2.main/androidhome",
    searchUrl: '/api.php/v2.vod/androidsearch10086?page=1&wd=**',
    searchable: 2,
    quickSearch: 1,
    filterable: 1,
    headers: {
        'User-Agent': 'okhttp/3.12.11',
        'version': 'XPGBOX com.phoenix.tv1.3.3',
        'token': 'dlsrzQiVkxgxYnpvfhTfMJlsPK3Y9zlHl+hovVfGeMNNEkwoyDQr1YEuhaAKbhz0SmxUfIXFGORrWeQrfDJQZtBxGWY/wnqwKk1McYhZES5fuT4ODVB13Cag1mDiMRIi8JQuZCJxQLfu8EEFUShX8dXKMHAT5jWTrDSQTJXwCDT2KRB4TUA7QF0pZbpvQPLVVzXf',
        'user_id': 'XPGBOX',
        'token2': 'XFxIummRrngadHB4TCzeUaleebTX10Vl/ftCvGLPeI5tN2Y/liZ5tY5e4t8=',
        'hash': 'c56f',
        'timestamp': '1727236846'
      },
    class_name: '电影&电视剧&综艺&动漫',
    class_url: '1&2&3&4',
    proxy_rule: $js.toString(() => {      
        let data=fetch(input.url,{headers:rule.headers})       
        // let m3u8=data.replace('URI="','URI="http://194.147.100.39')
        let m3u8=data.replace('URI="',`URI="${rule.host}`)        
        input = [200, 'application/vnd.apple.mpegurl', m3u8]
    }),
    play_parse: true,   
    lazy:$js.toString(() => {     
        let url=getProxyUrl()+'&url='+input    
        input = {
            url: url,
            parse: 0,
            header: rule.headers
        }
    }),
    推荐: $js.toString(() => {
        let data = JSON.parse(fetch(input)).data.list
        data.forEach(itt => {
            itt.list.forEach(it => {
                d.push({
                    url: it.id,
                    title: it.name,
                    img: it.pic,
                    desc: it.score,
                })
            })
        })
        setResult(d)
    }),
    一级: 'json:data;name;pic;score;id',
    二级: $js.toString(() => {
        let data = JSON.parse(request(input)).data
        let data1 = data.urls;
        let d = []
        data1.forEach(it => {
            d.push(it.key + "$" + `http://c.xpgtv.net/m3u8/${it.url}.m3u8`)
        })
        VOD = {
            vod_name: data.name,
            vod_play_from: '小苹果',
            vod_play_url: d.join('#')
        }
    }),
    搜索: '*',
}
var rule = {
  类型: '影视',
  title: '全看剧',
  desc: '源动力出品，发布页www.91qkw.cc',
  host: 'https://m.91qkw.cc',
  url: '/show/fyclass-fyfilter.html',
  headers: { "User-Agent": MOBILE_UA },
  searchUrl: '/search/**----------fypage---.html',
  searchable: 2,
  quickSearch: 0,
  timeout: 8000,
  play_parse: true,
  filterable: 1,
  filter_url: '{{fl.area}}-{{fl.sort}}------fypage---{{fl.year}}',
  hostJs: async function () {
    const hosts = [
      "https://m.91qkw.cc",
      "https://m.91qkw.com",
      "https://m.qkwaa.com",
      // "https://wwww.91qkw.com",
      // "https://www.qkw1.com",
      // "https://888.91qkw.cc"
    ];
    let curr = hosts[0];
    for (host of hosts) {
      const content = await request(host, { timeout: this.timeout, headers: this.headers });
      if (content) {
        curr = host;
        break;
      }
    }
    return curr;
  },
  预处理: async () => {
    return []
  },
  class_parse: async function () {
    const { input, pdfa, pdfh, pd } = this;
    const html = await request(input, { timeout: this.timeout, headers: this.headers });

    // 类处理
    const data = pdfa(html, ".stui-header__menu ul li");
    const classes = data
      .map((it) => {
        const type_id = pdfh(it, "a&&href").replace(/\/type\/(.*).html/g, "$1");
        const type_name = pdfh(it, "a&&Text");
        if (["首页", "留言"].includes(type_name)) return null;
        return { type_id, type_name };
      })
      .filter(Boolean);

    // 筛选处理
    const filters = {};
    const classIds = classes.map(it => it.type_id);
    for (const id of classIds) {
      const url = `${this.host}/show/${id}--time---------.html`;
      const html = await request(url, { timeout: this.timeout, headers: this.headers });
      const data = pdfa(html, ".stui-pannel .stui-screen__list");
      const categories = [
        { key: "area", name: "按地区" },
        { key: "year", name: "按年份" },
        { key: "sort", name: "按排序" },
      ];
      const sorts = {
        "时间": "time",
        "人气": "hits",
        "评分": "score",
      }
      filters[id] = categories
        .map((category) => {
          const filteredData =
            data.filter((item) => pdfh(item, "span.text-muted&&Text") === category.name)[0] ||
            [];
          if (filteredData.length === 0) return null;
          const values = pdfa(filteredData, "a")
            .map((it) => {
              const nv = pdfh(it, "a&&Text");
              if (nv === category.name) return null;
              return {
                n: nv || "全部",
                v: nv === "全部" ? "" : category.key === 'sort' ? sorts[nv] : nv,
              };
            })
            .filter(Boolean);
          return { key: category.key, name: category.name, value: values };
        })
        .filter(Boolean);
    }
    return { class: classes, filters };
  },
  推荐: async function (tid, pg, filter, extend) {
    const { input, pdfa, pdfh, pd } = this;
    const html = await request(input, { timeout: this.timeout, headers: this.headers });
    const d = [];
    const data = pdfa(html, 'ul.stui-vodlist li');
    data.forEach((it) => {
      d.push({
        title: pdfh(it, '.stui-vodlist__title a&&Text'),
        pic_url: pdfh(it, '.stui-vodlist__thumb&&data-original'),
        desc: pdfh(it, '.stui-vodlist__thumb .pic-text&&Text'),
        url: pdfh(it, '.stui-vodlist__thumb&&href'),
      })
    });
    return setResult(d);
  },
  一级: async function (tid, pg, filter, extend) {
    const { input, pdfa, pdfh, pd } = this;
    const html = await request(input, { timeout: this.timeout, headers: this.headers });
    const d = [];
    const data = pdfa(html, 'ul.stui-vodlist li');
    data.forEach((it) => {
      d.push({
        title: pdfh(it, '.stui-vodlist__title a&&Text'),
        pic_url: pdfh(it, '.stui-vodlist__thumb&&data-original'),
        desc: pdfh(it, '.stui-vodlist__thumb .pic-text&&Text'),
        url: pdfh(it, '.stui-vodlist__thumb&&href'),
      })
    });
    return setResult(d);
  },
  二级: async function (ids) {
    const { input, pdfa, pdfh, pd } = this;
    const url = `${rule.host}${ids[0]}`;
    const html = await request(url, { timeout: this.timeout, headers: this.headers });
    const vod = {
      vod_id: ids[0],
      vod_name: pdfh(html, '.stui-content .stui-content__detail .title strong&&Text'),
      vod_content: pdfh(html, '.stui-content .stui-content__detail .desc--span--a&&Text'),
      vod_pic: pdfh(html, '.stui-content .stui-content__thumb img&&data-original'),
    };
    let playFroms = [];
    let playUrls = [];
    const playList = pdfa(html, '.stui-pannel__head');
    playList.forEach((it) => {
      const title = pdfh(it, 'h3.title&&Text');
      if (!['猜你喜欢', '剧情介绍'].includes(title)) {
        playFroms.push(title);
      }
    });
    const indexList = pdfa(html, '.stui-pannel');
    indexList.forEach((lines) => {
      const tmpUrls = [];
      const line = pdfa(lines, 'ul.stui-content__playlist li');
      line.forEach((play) => {
        const index = pdfh(play, 'a&&Text');
        const url = pdfh(play, 'a&&href');
        tmpUrls.push(`${index}$${url}`);
      });
      if (tmpUrls.length > 0) playUrls.push(tmpUrls.join('#'));
    });
    vod.vod_play_from = playFroms.join('$$$');
    vod.vod_play_url = playUrls.join('$$$');

    return vod;
  },
  搜索: async function (wd, quick, pg) {
    let { input, pdfa, pdfh, pd } = this;
    input = encodeURI(input)
    console.warn(input)

    const html = await request(input, { timeout: this.timeout, headers: this.headers });
    console.warn(html)

    const d = [];
    const data = pdfa(html, 'ul.stui-vodlist li');
    console.warn(data)
    data.forEach((it) => {
      d.push({
        title: pdfh(it, '.stui-vodlist__title a&&Text'),
        pic_url: pdfh(it, '.stui-vodlist__thumb&&data-original'),
        desc: pdfh(it, '.stui-vodlist__thumb .pic-text&&Text'),
        url: pdfh(it, '.stui-vodlist__thumb&&href'),
      })
    });
    return setResult(d);
  },
  lazy: async function (flag, id, flags) {
    const { input, pdfa, pdfh, pd } = this;
    let url = `${rule.host}${id}`;

    // 1. 获取 player_aaa 参数
    const html = await request(url, { timeout: this.timeout, headers: this.headers });
    const script = pdfa(html, '.stui-player__video script');
    const scriptContent = script.filter((e) => e.includes("player_aaaa"))[0];

    const scriptRegex = /var player_aaaa=({[^;]+})/;
    const scriptMatch = scriptContent.match(scriptRegex);
    if (!scriptMatch || !scriptMatch[1]) {
      return { parse: 1, url }
    };
    const player_aaaa = JSON.parse(scriptMatch[1]);

    // 2.获取播放器链接
    const playerUrl = `${this.host}/static/player/${player_aaaa.from}.js?ver=1`;
    const playerHtml = await request(playerUrl);
    const playerRegex = /http(.*?)MacPlayer\.Playdata\+'/g;
    const playerMatch = playerHtml.match(playerRegex);
    if (!playerMatch || !playerMatch[1]) {
      return { parse: 1, url };
    }
    let playerData = playerMatch[1];
    // "https://cdn-omtcqq-com-oss-cn-hangzhou-shanghai-yys-valipl-vip-cp13.xmsu8.top/m3u8/tcbfq/m3u8.php?url='+MacPlayer.PlayUrl+'&type=wolong&data='+MacPlayer.Playdata+'"


    // 3.获取真实链接
    const ossUrl = playerData.replace("'+MacPlayer.PlayUrl+'", player_aaaa.url).replace("'+MacPlayer.Playdata+'", player_aaaa.play_data);
    const ossHtml = await request(ossUrl);
    // var urls = 'https://zyz-omtcqq-com-oss-cn-hangzhou-shanghai-yys-valipl-vip-cp12.xmsu8.top/zyzm3u8/m3u8_wolongcache/b389e614fbe24e57b668a85feabe1976.m3u8?st=1GVhUNm-NhzWBGE4Dp-y7g&e=1737748564';
    const ossRegex = /var\s+urls\s*=\s*'([^;]+)';/;
    const ossMatch = ossHtml.match(ossRegex);
    if (!ossMatch || !ossMatch[1]) {
      return { parse: 1, url };
    }
    const ossData = ossMatch[1];

    if (/m3u8|mp4|flv/.test(ossData)) {
      return { parse: 0, url: ossData }
    } else {
      return { parse: 1, url }
    }
  },
}

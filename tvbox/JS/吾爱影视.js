var rule = {
  类型: '影视',
  title: '吾爱影视',
  desc: '源动力出品',
  host: 'https://52movies.top',
  url: '/vodshow/fyclass-fyfilter/',
  searchUrl: '/vodsearch/**----------fypage---/',
  searchable: 1,
  quickSearch: 0,
  timeout: 5000,
  play_parse: true,
  filterable: 1,
  filter_url: "{{fl.area}}-{{fl.by}}-{{fl.class}}-{{fl.lang}}-{{fl.letter}}---fypage---{{fl.year}}",
  预处理: async () => [],
  class_parse: async function () {
    const { input, pdfa, pdfh, pd } = this;
    const filters = {};
    const html = await request(input, { headers: this.headers, timeout: this.timeout });
    // 类处理
    const data = pdfa(html, ".myui-header__menu li.hidden-sm");
    const classes = data
      .map((it) => {
        const type_id = pdfh(it, "a&&href").replace(/\/vodtype\/(.*?)\/?$/g,"$1");
        const type_name = pdfh(it, "a&&Text");
        if (["首页"].includes(type_name)) return null;
        return { type_id, type_name };
      })
      .filter(Boolean);

    // 筛选处理
    const htmlUrl = classes.map((item) => ({
      url: `${this.host}/vodshow/${item.type_id}-----------/`,
      options: { timeout: this.timeout, headers: this.headers },
    }));
    const htmlArr = await batchFetch(htmlUrl);
    htmlArr.map((it, i) => {
      const type_id = classes[i].type_id;
      const data = pdfa(it, ".myui-screen__list");
      const categories = [
        { key: "class", name: "剧情" },
        { key: "area", name: "地区" },
        { key: "year", name: "年份" },
        { key: "lang", name: " 语言" },
        { key: "letter", name: "字母" },
        { key: "by", name: "排序" },
      ];
      filters[type_id] = categories
        .map((category) => {
          const filteredData =
            data.filter((item) => pdfh(item, "a&&Text") === category.name)[0] ||
            [];
          if (filteredData.length === 0) return null;
          const values = pdfa(filteredData, "a")
            .map((it) => {
              const nv = pdfh(it, "a&&Text");
              if (nv === category.name) return null;
              return {
                n: nv || "全部",
                v: nv === "全部" ? "" : nv,
              };
            })
            .filter(Boolean);
          return { key: category.key, name: category.name, value: values };
        })
        .filter(Boolean);
    });
    return { class: classes, filters };
  },
  推荐: async function (tid, pg, filter, extend) {
    const homeFn = await rule.一级.bind(this);
    return await homeFn();
  },
  一级: async function (tid, pg, filter, extend) {
    const { input, pdfa, pdfh } = this;
    const html = await request(input, { headers: this.headers, timeout: this.timeout });
    const data = pdfa(html, ".myui-panel-box ul.myui-vodlist li");
    const d = data.map((it) => {
      return {
        vod_id: pdfh(it, ".myui-vodlist__detail h4 a&&href").replace(/\/voddetail\/(.*?)\//g, "$1"),
        vod_name: pdfh(it, ".myui-vodlist__detail h4 a&&Text"),
        vod_pic: pdfh(it, ".myui-vodlist__thumb&&data-original"),
        vod_remarks: pdfh(it, ".myui-vodlist__thumb .pic-text&&Text"),
      };
    });
    return d;
  },
  二级: async function (ids) {
    const { pdfa, pdfh } = this;
    const html = await request(`${this.host}/voddetail/${ids[0]}/`, { headers: this.headers, timeout: this.timeout });
    const VOD = {
      vod_id: ids[0],
      vod_name: pdfh(html, ".myui-content__detail h1.title--font&&Text").trim(),
      vod_pic: pdfh(html, ".myui-content__thumb a img&&data-original"),
      vod_director: (() => {
        const it = pdfa(html, ".myui-content__detail p").filter((item) =>
          item.includes("导演")
        )?.[0];
        if (!it) return "";
        return pdfa(it, "a")
          .map((item) => pdfh(item, "a&&Text"))
          .join("|");
      })(),
      vod_actor: (() => {
        const it = pdfa(html, ".myui-content__detail p").filter((item) =>
          item.includes("主演")
        )?.[0];
        if (!it) return "";
        return pdfa(it, "a")
          .map((item) => pdfh(item, "a&&Text"))
          .join("|");
      })(),
      vod_douban_score: pdfh(
        html,
        ".myui-content__detail .score .branch&&Text"
      ),
      vod_score: pdfh(html, ".myui-content__detail .score .branch&&Text"),
      vod_remarks: pdfh(
        pdfa(html, ".myui-content__detail p").filter((item) =>
          item.includes("更新")
        )?.[0],
        ".text-red&&Text"
      ).trim(),
      vod_content: pdfh(
        html,
        ".myui-panel:eq(1) .myui-panel-box span.data p&&Text"
      ),
      vod_play_from: pdfa(html, "ul.nav.nav-tabs.active:eq(0) li")
        .map((item) => pdfh(item, "a&&Text"))
        .join("$$$"),
      vod_play_url: (() => {
        const playlists = pdfa(html, ".tab-content:eq(0) .tab-pane");
        return playlists
          .map((item) => {
            const playlist = pdfa(item, "ul li");
            return playlist
              .map((it) => {
                const lineName = pdfh(it, "a&&Text");
                const lineId = pdfh(it, "a&&href").replace(
                  /\/vodplay\/(.*)\//g,
                  "$1"
                );
                return `${lineName}$${lineId}`;
              })
              .join("#");
          })
          .join("$$$");
      })(),
    };
    return VOD;
  },
  搜索: async function (wd, quick, pg) {
    let { input, pdfa, pdfh } = this;
    let html = await request(input, { headers: this.headers, timeout: this.timeout });
    let data = pdfa(html, ".col-md-wide-7 .myui-panel-box ul.myui-vodlist__media li");
    const d = data.map((it) => {
      return {
        vod_id: pdfh(it, ".detail h4 a&&href").replace(/\/voddetail\/(.*?)\//g, "$1"),
        vod_name: pdfh(it, ".detail h4 a&&Text"),
        vod_pic: pdfh(it, ".thumb a&&data-original"),
        vod_remarks: pdfh(it, ".thumb .pic-text&&Text")?.trim(),
      };
    });
    return d;
  },
  lazy: async function (flag, id, flags) {
    let url = `${this.host}/vodplay/${id}/`;
    const html = await request(url, { headers: this.headers, timeout: this.timeout });
    const script = pdfa(html, 'body script');
    const scriptContent = script.filter((e) => e.includes("player_aaaa"))[0];
    const scriptRegex = /var player_aaaa=({[^;]+})/;
    const match = scriptContent.match(scriptRegex);
    if (match && match?.[1]) {
      try {
        const matchStr = match[1];
        const matchJson = JSON.parse(matchStr);
        url = matchJson.url;
      } catch (err) { }
    };

    if (/m3u8|mp4|flv/.test(url)) {
      return { parse: 0, url }
    } else {
      return { parse: 1, url }
    }
  }
}


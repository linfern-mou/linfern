var rule = {
  类型: "影视",
  title: "囧次元",
  desc: "源动力出品",
  host: "https://www.jocyweb.com",
  apiHost: "https://jocy-api.6b7.xyz",
  url: "/#/library",
  searchUrl: "#/search?wd=**",
  searchable: 2,
  quickSearch: 0,
  timeout: 10000,
  play_parse: true,
  filterable: 1,
  headers: { "User-Agent": "PC_UA" },
  预处理: async function () {
    return [];
  },
  class_parse: async function () {
    const html = await request(`${this.apiHost}/app/channel`);
    const list = JSON.parse(html).data;
    const filters = {};

    // 类处理
    const classes = list.map((it) => { return { type_id: it.id, type_name: it.name }})

    // 筛选处理
    list.map((it, i) => {
      const type_id = classes[i].type_id;
      const categories = [
        { key: "area", name: "地区" },
        { key: "year", name: "年份" },
        { key: "type", name: "类型" },
        { key: "sort", name: "排序" }
      ];
      filters[type_id] = categories
        .map((category) => {
          if (category.key === "sort") {
            const value = [
              { n: "最新上线", v: "addtime" },
              { n: "最多播放", v: "weight" },
              { n: "热门推荐", v: "hits" },
              { n: "最多好评", v: "gold" }
            ];
            return { key: category.key, name: category.name, value };
          } else {
            const key = `${category.key}s`;
            const value = it[key].map((it) => { return { n: it, v: it }});
            value.unshift({ n: "全部", v: "" });
            return { key: category.key, name: category.name, value };
          }
        })
    });
    return { class: classes, filters };
  },
  推荐: async function (tid, pg, filter, extend) {
    const channelList = [1, 2, 26, 3];
    let d = [];
    for (channel in channelList) {
      const html = await request(`${this.apiHost}/app/video/list?area=&channel=${channel}&enablePagination=false&limit=12&page=1&sort=weight&type=&year=`);
      const list = JSON.parse(html).data.items;
      const formatList = list.map((it) => {
        return {
          vod_id: it.id,
          vod_pic: it.pic,
          vod_name: it.name,
          vod_remarks: it.continu,
        };
      });
      d = d.concat(formatList);
    }
    return d;
  },
  一级: async function (tid, pg, filter, extend) {
    const params = {
      ...extend,
     channel: tid,
     page: pg,
     limit: 12,
     enablePagination: false,
    }
    const queryString = qs.stringify(params);
    const html = await request(`${this.apiHost}/app/video/list?${queryString}`);
    const list = JSON.parse(html).data.items;
    const d = list.map((it) => {
      return {
        vod_id: it.id,
        vod_pic: it.pic,
        vod_name: it.name,
        vod_remarks: it.continu,
      };
    });
    return d;
  },
  二级: async function (ids) {
    const html = await request(`${this.apiHost}/app/video/detail?id=${ids[0]}`);
    const data = JSON.parse(html).data;
    const vod = {
      vod_id: ids[0],
      vod_name: data.name,
      vod_pic: data.pic,
      vod_remarks: data.continu,
      vod_director: data.director,
      vod_actor: data.actor,
      type_name: data.type,
      vod_year: data.year,
      vod_content: data.content,
      vod_play_from: data.parts.map((it) => it.play_zh).join("$$$"),
      vod_play_url: data.parts.map((it) => {
       return it.part.map((line) => `${line}$${ids[0]}-${it.play}-${line}`).join("#");
      }).join("$$$"),
    };
    return vod;
  },
  搜索: async function (wd, quick, pg) {
    const html = await request(`${this.apiHost}/app/video/search?key=${wd}&limit=25&page=${pg}`);
    const list = JSON.parse(html).data.items;
    const d = list.map((it) => {
      return {
        vod_id: it.id,
        vod_pic: it.pic,
        vod_name: it.name,
        vod_remarks: it.continu,
      };
    });
    return d;
  },
  lazy: async function (flag, id, flags) {
    const [index, play, part] = id.split("-");
    const orginUrl = `${this.host}/#/video/${index}?play=${play}&part=${part}`;

    try {
      const html = await request(`${this.apiHost}/app/video/play?id=${index}&play=${play}&part=${part}`, {
        headers: {
          "x-token": this.authorization || '',
        }
      });
      const resp = JSON.parse(html);
      const code = resp.code;
      if (code === 510423) {
        await this.token();
        await this.lazy(flag, id, flags);
      }
      const url = resp.url.single;
      const type = resp.type;
      if (/m3u8|mp4|flv|mpd/.test(type)) {
        return { parse: 0, url };
      } else {
        return { parse: 1, url: orginUrl };
      }
    } catch {
      return { parse: 1, url: orginUrl };
    }
  },
  token: async function () {
    const html = await request(`${this.apiHost}/app/users/login`, {
      method: "POST",
      body: {
        "username": "uqeaxtrc@bccto.cc",
        "phone": "",
        "email": "uqeaxtrc@bccto.cc",
        "password": "zxc456+-",
        "enum": 1
      },
      headers: { "Content-Type": "application/json" }
    });
    const resp = JSON.parse(html);
    const token = resp.data.token;
    this.authorization = token;
    return token;
  }
};
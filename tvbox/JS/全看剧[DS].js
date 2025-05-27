var rule = {
    类型: '影视',
    title: '全看剧',
    desc: '源动力出品',
    host: 'https://wwww.91qkw.com',
    //url: '/type/fyclass-fypage.html',
    url: '/show/fyclass-fyfilter.html',
    searchUrl: '/search/**----------fypage---.html',
    searchable: 2,
    quickSearch: 0,
    timeout: 5000,
    play_parse: true,
    filterable: 1,
    class_name: '电影&连续剧&综艺&动漫&短剧',
    class_url: '1&2&3&4&28',
    filter_url: '{{fl.area}}-{{fl.by}}-{{fl.class}}-----fypage---{{fl.year}}',
    预处理: async () => {
      return []
    },
    推荐: async function (tid, pg, filter, extend) {
      const { input, pdfa, pdfh, pd } = this;
      const html = await request(input);
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
      const html = await request(input);
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
      const html = await request(url);
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
      console.warn(indexList);
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
      const { input, pdfa, pdfh, pd } = this;
      const html = await request(input);
      const response = JSON.parse(html);
      const data = response.data.List;
      let d = [];
      data.forEach((it) => {
        d.push({
          vod_name: it.vod_name,
          vod_pic: it.vod_pic,
          vod_desc: it.vod_blurb,
          vod_id: it.vod_id,
          vod_remarks: it.vod_remarks
        })
      });
      return d;
    },
    lazy: async function (flag, id, flags) {
      const { input, pdfa, pdfh, pd } = this;
      let url = `${rule.host}${id}`;

      // 1. 获取 player_aaa 参数
      const html = await request(url);
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
    filter:'H4sIAAAAAAAA/+2Y3W4aRxTH7/sU1V77wovdJM2rVLmgEVKjpqlkJ5WsyBI2xgFMDFjUDgEbuzaGOMZef9SFJcDL7MzCW3TYOR9jqVqtVC6XK37n7Jk9Z77+M/vesq3nP723fk2tWc+tl6+Tq6vWgvUm+VtKoci3ZSar+I/k63ep4Lk3M3O2M810ZmYF1voCWPcb6nmwAqDPz91AQwzokxtlmd4HHwC1Weh4wwa2qYHabFdEf4BtaqA4SpyB3pf75Ll5fJ8G9E2656J4AT4Ael/h2h+iD8DI068OOM8ZkK/1gfMEoFy6597oGHPRQHHbe9PaF4zTQHFHFypzjNNAvs1Lf7+CPg3kyxTk5mf0aaD6BiWR7WF9GtA3PdyTn1rgA6A29z9M8i62qYFqGF351b/F8AbLIKYnSmeTUxopDeTb3RalW/RpoJEal1U/40hp4J5ryMMK9VwA5Nsa+1+xEgDqgWHFHzQeJfzItP5i9qReKcmVVNJYKA1HFN2oC+WsPa1tYwoaqKPPa7J3DT6v1xX1IZi4wxzZHz16AkxUxmhXGbEADTRYd3+yD4C6dOeGfQAUd9CSjUuM00A5N79wHABPgH/YB8C5OGYuzqO4j45wzzFOA8VtlVSviRyuDWaqpDX2S10/X8NiiHnBHsudsQqjNYtMT2QfvAFuSwDmBFhLJVeMCdC/9wbDiBMgsZj4AWzBX8O+zPZl077E9iXTnmB7wrTbbLdN+yLbFw27/SPZ1V/D/oztz0z7U7Y/Ne1P2P7EtHO9tlmvzfXaZr0212ub9dpcr23Wa3O9tlmvzfWqv+bw/bzGgyd394Rbijh48uBhenAP1revVAPo8VxXOlXw/PLq7SrPx+stkcMVv/ry95XULJcXC999r35WYl4CHLKVTjND0dvENaohyuYuNh5EpoRtaogi6pNOmn0AUQ4K4upBuF30aYgizmK77rk7tOUHEEVkw8QyTH7CJMZvHU2uD7FfNEQ6tDgVJUjYpgbKs3zkX1KeGqhfnI98GACIctgJ9qxTfJ+GKIedsANb2AEj7FD2n4ekWG5juY3lNpbbucmttTQnqfUbTfV6v53GZU9MOVyNJ04OF4QG3iSzcqtJm2QAtLrTeW4WgPsiK3t4QwMwdqHpKbYJwHvYKbcJQG3Wb43bm4YooqPeLXN4MABgwS1OckckuAFQntWmvCcB1MA7253XL9POFoAxD4RDwqKB2qwXZA1rAKBx2CiKBvoAogiu716IK6wBgN9X9759pvcFEItVLFaxWMViNUexWp7XvTDfVruen0c1Yqa8v32V1T4uGQ2hJ3NaKSGfZzPdyQnpo4ZIt6CQT6lhgiTKRZmmJauBb2shn1KPT0Qdb5wA5Gu4xmdWDTRuIR8gQ29dSmf6OEcAKG6345dxLgCYca07I04B9efZyBAkDXyLbYpcHeM08Ky8FV0UXIAooioKN2J8QGMUAO/cJ9PDv2jnDiDqvhkLZyycsXDGwvl/hHP9X6I8G9LSHAAA'
  }

var rule = {
    title: '',
    host: 'https://xsmnovel.com',
    url: '/fyclass/page/fypage',
    searchUrl: '/page/fypage/?cat&s=**',
    class_parse: '#menu-main-menu&&a;a&&Text;a&&href;.*/(.*?)/',
    play_parse: true,
    lazy: $js.toString(() => {
        let html = request(input);
        let title = pdfh(html, '.entry-header&&h1&&Text');
        let content = pdfh(html, '.entry-content&&Html').replace(/<p>/g, '\n').replace(/\n\n/g, '\n');
        let ret = JSON.stringify({
            title,
            content
        });
        input = {parse: 0, url: 'novel://' + ret, js: ''};
    }),
    推荐: '*',
    一级: '.scroll&&.col-6;a&&title;img&&data-src;span&&Text;a&&href;详情',
    二级: '*',
    搜索: '*',
}
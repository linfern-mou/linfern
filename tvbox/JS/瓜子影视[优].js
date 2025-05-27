var rule = {
  title: '瓜子影视',
  host: 'https://www.gzvod.cc/',
  url: '/index.php/vod/show/id/fyclass/page/fypage.html',
  searchUrl: '/index.php/vod/search/page/fypage/wd/**.html',
  searchable: 2,
  quickSearch: 0,
  filterable: 0,
  headers: {
    'User-Agent': 'MOBILE_UA',
    'Referer': 'https://www.gzvod.cc/'  // 新增防盗链
  },
  class_parse: '.menu a:gt(0):lt(7);a&&Text;a&&href;.*/(.*?).html',
  play_parse: true,
  lazy: `js:
window.onload = function () {
    var screenWidth = window.innerWidth;
    if (screenWidth < 800) {
        var searchBox = document.querySelector('.search-box');
        var newLink = document.createElement('a');
        newLink.href = '/index.php/label/search.html';
        searchBox.parentNode.insertBefore(newLink, searchBox);
        newLink.appendChild(searchBox);
    } else {
        $('.search-field').focus(function() {
            $('.hot-recommend-box').removeClass('hidden').addClass('visible');
        });
        $('.search-field').blur(function() {
            setTimeout(function() {
                if (!$(event.relatedTarget).closest('.hot-recommend-box').length) {
                    $('.hot-recommend-box').removeClass('visible').addClass('hidden');
                }
            }, 0);
        });
        $('.hot-recommend-box').on('mouseenter', function() {
            $(this).data('hovered', true);
        }).on('mouseleave', function() {
            $(this).data('hovered', false);
        });
        $(document).on('blur', '.search-field', function(event) {
            if (!$('.hot-recommend-box').data('hovered')) {
                $('.hot-recommend-box').removeClass('visible').addClass('hidden');
            }
        });
    }
};

let pclick = 'document.querySelector('.search-box').contentWindow.document.querySelector("#start").click()';
input = { parse: 1, url: input, js: pclick, click: pclick }
`
,
  limit: 6,
  double: true,
  推荐: '*',
  一级: '.myui-vodbox-content a;.card-info .title&&Text;img&&src;.score&&Text;a&&href',
  二级: {
    title: '.title-box&&h1&&Text;.tag:eq(3)&&Text',
    img: 'img&&src',
    desc: `{{[
      '类型：##.tag:eq(1)',
      '地区：##.tag:eq(2)',
      '年份：##.tag:eq(3)'
    ].join('｜')}}`,
    content: '.intro&&Text',
    tabs: '.nav.nav-btn li',
    lists: '.tab-pane.lists-box:eq(#id) a',
  },
  搜索: '*',
}
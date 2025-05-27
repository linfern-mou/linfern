muban.首图2.二级.desc = '.data:eq(0)&&Text;;;.data--span:eq(2)&&Text;.data--span:eq(1)&&Text';
muban.首图2.二级.tabs = '.stui-pannel__head h3';
var rule = {
    title:'星辰',
    模板:'首图2',
    host:'http://www.40yb.com',
    // url:'/fyclass/indexfypage.html[/fyclass/index.html]',
    url:'/fyfilter/indexfypage.html[/fyfilter/index.html]',
    filterable:1,//是否启用分类筛选,
    filter_url:'{{fl.cateId}}',
    filter:{
        "dianying":[{"key":"cateId","name":"分类","value":[{"n":"全部","v":"dianying"},{"n":"动作片","v":"dongzuopian"},{"n":"爱情片","v":"aiqingpian"},{"n":"科幻片","v":"kehuanpian"},{"n":"恐怖片","v":"kongbupian"},{"n":"喜剧片","v":"xijupian"},{"n":"剧情片","v":"juqingpian"}]}],
        "dianshiju":[{"key":"cateId","name":"分类","value":[{"n":"全部","v":"dianshiju"},{"n":"国产剧","v":"guochanju"},{"n":"港台剧","v":"tangtaiju"},{"n":"欧美剧","v":"oumeiju"},{"n":"日韩剧","v":"rihanju"}]}]
    },
    play_parse:true,
    lazy:`js:
        pdfh = jsp.pdfh;
        var html = request(input);
        var ohtml = pdfh(html, '.videoplay&&Html');
        var url = pdfh(ohtml, "body&&iframe&&src");
        if (/Cloud/.test(url)) {
            var ifrwy = request(url);
            let code = ifrwy.match(/var url = '(.*?)'/)[1].split('').reverse().join('');
            let temp = '';
            for (let i = 0x0; i < code.length; i = i + 0x2) {
                temp += String.fromCharCode(parseInt(code[i] + code[i + 0x1], 0x10))
            }
            input = {
                jx: 0,
                url: temp.substring(0x0, (temp.length - 0x7) / 0x2) + temp.substring((temp.length - 0x7) / 0x2 + 0x7),
                parse: 0
            }
        } else if (/decrypted/.test(ohtml)) {
            var phtml = pdfh(ohtml, "body&&script:not([src])&&Html");
            eval(getCryptoJS());
            var scrpt = phtml.match(/var.*?\\)\\);/g)[0];
            var data = [];
            eval(scrpt.replace(/md5/g, 'CryptoJS').replace('eval', 'data = '));
            input = {
                jx: 0,
                url: data.match(/url:.*?[\\'\\"](.*?)[\\'\\"]/)[1],
                parse: 0
            }
        } else {
            input
        }
	`,
    filter_def:{
        dianying:{cateId:'dianying'},
        dianshiju:{cateId:'dianshiju'},
        zongyi:{cateId:'zongyi'},
        dongman:{cateId:'dongman'}
    },
    // searchUrl:'/search.php?page=fypage&searchword=**&searchtype=',
    searchUrl:'/search.php#searchword=**;post',
    class_parse:'.stui-header__menu li:gt(0):lt(7);a&&Text;a&&href;.*/(.*?)/.*html',
}
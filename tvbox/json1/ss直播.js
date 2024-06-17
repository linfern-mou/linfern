var rule = {
    title:'ss直播',
    host:'http://api.hclyz.com:81',/*http://api.hclyz.com:81/mf/yuncaidan.txt,json格式没加密，地址http://api.hclyz.com:81/mf/json.txt 
宽带已增加到50M，放心调用 前面加http://api.hclyz.com:81/mf/ 
mc=名称
tp1=图片
dz=地址备用域名：api.maiyoux.com:81
最新域名获取地址：https://www.ebay.com/usr/xiar2792*/
    homeUrl:'/mf/json.txt',
    url:'/mf/fyclass',
    class_name:'all',
    class_url:'json.txt',
    headers:{
        'User-Agent':'MOBILE_UA',
    },
    timeout:5000,
    limit:200,
    play_parse:true,
    lazy:'',
    一级:'json:pingtai;title;xinimg;Number;address',
    二级:'js:var d=[];var jo=JSON.parse(request(input)).zhubo;VOD={};for(var i=0;i<jo.length;i++){d.push({title:jo[i].title,url:jo[i].address})}VOD.vod_play_from="播放源";VOD.vod_play_url=d.map(function(it){return it.title+"$"+it.url}).join("#");setResult(d);',
    搜索:'*',
}
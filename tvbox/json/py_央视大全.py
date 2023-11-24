#coding=utf-8
#!/usr/bin/python
import sys
sys.path.append('..') 
from base.spider import Spider
import json
import time
import base64

class Spider(Spider):  # 元类 默认的元类 type
	def getName(self):
		return "央视大全"
	def init(self,extend=""):
		print("============{0}============".format(extend))
		pass
	def isVideoFormat(self,url):
		pass
	def manualVideoCheck(self):
		pass
	def homeContent(self,filter):
		result = {}
		cateManual = {
			"央视大全": "CCTV"
		}
		classes = []
		for k in cateManual:
			classes.append({
				'type_name':k,
				'type_id':cateManual[k]
			})
		result['class'] = classes
		if(filter):
			result['filters'] = self.config['filter']
		return result
	def homeVideoContent(self):
		result = {
			'list':[]
		}
		return result
	def categoryContent(self,tid,pg,filter,extend):		
		result = {}
		month = ""
		year = ""
		if 'month' in extend.keys():
			month = extend['month']
		if 'year' in extend.keys():
			year = extend['year']
		if year == '':
			month = ''
		prefix = year + month
		extend['p'] = pg
		filterMap = {
			"fl":"",
			"fc":"",
			"cid":"",
			"p":"1"
		}
		suffix = ""
		for key in filterMap.keys():
			if key in extend.keys():
				filterMap[key] = extend[key]
			suffix = suffix + '&' + key + '=' + filterMap[key]
		url = 'https://api.cntv.cn/lanmu/columnSearch?{0}&n=20&serviceId=tvcctv&t=json'.format(suffix)
		jo = self.fetch(url,headers=self.header).json()
		vodList = jo['response']['docs']
		videos = []
		for vod in vodList:
			lastVideo = vod['lastVIDE']['videoSharedCode']
			if len(lastVideo) == 0:
				lastVideo = '_'
			guid = prefix+'###'+vod['column_name']+'###'+lastVideo+'###'+vod['column_logo']
			# guid = prefix+'###'+vod['column_website']+'###'+vod['column_logo']
			title = vod['column_name']
			img = vod['column_logo']
			videos.append({
				"vod_id":guid,
				"vod_name":title,
				"vod_pic":img,
				"vod_remarks":''
			})
		result['list'] = videos
		result['page'] = pg
		result['pagecount'] = 9999
		result['limit'] = 90
		result['total'] = 999999
		return result
	def detailContent(self,array):
		aid = array[0].split('###')
		tid = aid[0]
		logo = aid[3]
		lastVideo = aid[2]
		title = aid[1]
		date = aid[0]
		if lastVideo == '_':
			return {}

		lastUrl = 'https://api.cntv.cn/video/videoinfoByGuid?guid={0}&serviceId=tvcctv'.format(lastVideo)
		lastJo = self.fetch(lastUrl,headers=self.header).json()
		topicId = lastJo['ctid']
		url = "https://api.cntv.cn/NewVideo/getVideoListByColumn?id={0}&d={1}&p=1&n=100&sort=desc&mode=0&serviceId=tvcctv&t=json".format(topicId,date)
		jo = self.fetch(url,headers=self.header).json()
		vodList = jo['data']['list']
		videoList = []
		for video in vodList:
			videoList.append(video['title']+"$"+video['guid'])
		if len(videoList) == 0:
			return {}
		if len(date) == 0:
			date = time.strftime("%Y", time.localtime(time.time()))
		vod = {
			"vod_id":array[0],
			"vod_name":date +" "+title,
			"vod_pic":logo,
			"type_name":lastJo['channel'],
			"vod_year":date,
			"vod_area":"",
			"vod_remarks":date,
			"vod_actor":"",
			"vod_director":topicId,
			"vod_content":"当前页面默认只展示最新100期的内容，可在分类页面选择年份和月份进行往期节目查看。年份和月份仅影响当前页面内容，不参与分类过滤。视频默认播放可以获取到的最高帧率。"
		}

		vod['vod_play_from'] = '🌸荷城茶秀接口🌸CCTV线路'
		vod['vod_play_url'] = "#".join(videoList)
		result = {
			'list':[
				vod
			]
		}
		return result
	# def detailContent(self,array):
	# 	aid = array[0].split('###')
	# 	tid = aid[0]
	# 	logo = aid[2]
	# 	webSite = aid[1]
	# 	date = aid[0]
	# 	rsp = self.fetch(webSite,headers=self.header)
	# 	topicId = ''
	# 	root = self.html(rsp.text)
	# 	topicId = self.regStr(rsp.text,"(TOPC[0-9]{16})")
	# 	title = root.xpath('.//title/text()')[0]
	# 	if len(topicId) <= 0:
	# 		return {}
	# 	url = "https://api.cntv.cn/NewVideo/getVideoListByColumn?id={0}&d={1}&p=1&n=100&sort=desc&mode=0&serviceId=tvcctv&t=json".format(topicId,date)
	# 	jo = self.fetch(url,headers=self.header).json()
	# 	vodList = jo['data']['list']
	# 	videoList = []
	# 	for video in vodList:
	# 		videoList.append(video['title']+"$"+video['guid'])
	# 	if len(videoList) == 0:
	# 		return {}
	# 	if len(date) == 0:
	# 		date = '近期'
	# 	vod = {
	# 		"vod_id":array[0],
	# 		"vod_name":date +" "+title,
	# 		"vod_pic":logo,
	# 		"type_name":'',
	# 		"vod_year":date,
	# 		"vod_area":"",
	# 		"vod_remarks":date,
	# 		"vod_actor":"",
	# 		"vod_director":"",
	# 		"vod_content":"详情页面默认只展示最新100期的内容，可以在分类页面选择年份和月份进行往期节目查看。年份和月份仅影响视频详情内容，不参与分类过滤。视频默认播放最高帧率。"
	# 	}

	# 	vod['vod_play_from'] = 'CCTV'
	# 	vod['vod_play_url'] = "#".join(videoList)
	# 	result = {
	# 		'list':[
	# 			vod
	# 		]
	# 	}
	# 	return result
	def searchContent(self,key,quick):
		result = {
			'list':[]
		}
		return result
	def playerContent(self,flag,id,vipFlags):
		result = {}
		url = "https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid={0}".format(id)
		jo = self.fetch(url,headers=self.header).json()
		link = jo['hls_url'].strip()
		rsp = self.fetch(link,headers=self.header)
		content = rsp.text.strip()
		arr = content.split('\n')
		urlPrefix = self.regStr(link,'(http[s]?://[a-zA-z0-9.]+)/')

		subUrl = arr[-1].split('/')
		subUrl[3] = '1200'
		subUrl[-1] = '1200.m3u8'
		hdUrl = urlPrefix + '/'.join(subUrl)

		url = urlPrefix + arr[-1]

		hdRsp = self.fetch(hdUrl,headers=self.header)
		if hdRsp.status_code == 200:
			url = hdUrl

		result["parse"] = 0
		result["playUrl"] = ''
		result["url"] = url
		result["header"] = ''
		return result

	config = {
		"player": {},
		"filter": {"CCTV":[{"key":"cid","name":"频道","value":[{"n":"全部","v":""},{"n":"CCTV-1综合","v":"EPGC1386744804340101"},{"n":"CCTV-2财经","v":"EPGC1386744804340102"},{"n":"CCTV-3综艺","v":"EPGC1386744804340103"},{"n":"CCTV-4中文国际","v":"EPGC1386744804340104"},{"n":"CCTV-5体育","v":"EPGC1386744804340107"},{"n":"CCTV-6电影","v":"EPGC1386744804340108"},{"n":"CCTV-7国防军事","v":"EPGC1386744804340109"},{"n":"CCTV-8电视剧","v":"EPGC1386744804340110"},{"n":"CCTV-9纪录","v":"EPGC1386744804340112"},{"n":"CCTV-10科教","v":"EPGC1386744804340113"},{"n":"CCTV-11戏曲","v":"EPGC1386744804340114"},{"n":"CCTV-12社会与法","v":"EPGC1386744804340115"},{"n":"CCTV-13新闻","v":"EPGC1386744804340116"},{"n":"CCTV-14少儿","v":"EPGC1386744804340117"},{"n":"CCTV-15音乐","v":"EPGC1386744804340118"},{"n":"CCTV-16奥林匹克","v":"EPGC1634630207058998"},{"n":"CCTV-17农业农村","v":"EPGC1563932742616872"},{"n":"CCTV-5+体育赛事","v":"EPGC1468294755566101"}]},{"key":"fc","name":"分类","value":[{"n":"全部","v":""},{"n":"新闻","v":"新闻"},{"n":"体育","v":"体育"},{"n":"综艺","v":"综艺"},{"n":"健康","v":"健康"},{"n":"生活","v":"生活"},{"n":"科教","v":"科教"},{"n":"经济","v":"经济"},{"n":"农业","v":"农业"},{"n":"法治","v":"法治"},{"n":"军事","v":"军事"},{"n":"少儿","v":"少儿"},{"n":"动画","v":"动画"},{"n":"纪实","v":"纪实"},{"n":"戏曲","v":"戏曲"},{"n":"音乐","v":"音乐"},{"n":"影视","v":"影视"}]},{"key":"fl","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"B","v":"B"},{"n":"C","v":"C"},{"n":"D","v":"D"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"}]},{"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"},{"n":"2007","v":"2007"},{"n":"2006","v":"2006"},{"n":"2005","v":"2005"},{"n":"2004","v":"2004"},{"n":"2003","v":"2003"},{"n":"2002","v":"2002"},{"n":"2001","v":"2001"},{"n":"2000","v":"2000"}]},{"key":"month","name":"月份","value":[{"n":"全部","v":""},{"n":"12","v":"12"},{"n":"11","v":"11"},{"n":"10","v":"10"},{"n":"09","v":"09"},{"n":"08","v":"08"},{"n":"07","v":"07"},{"n":"06","v":"06"},{"n":"05","v":"05"},{"n":"04","v":"04"},{"n":"03","v":"03"},{"n":"02","v":"02"},{"n":"01","v":"01"}]}]}
	}
	header = {
		"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.54 Safari/537.36",
		"Origin": "https://tv.cctv.com",
		"Referer": "https://tv.cctv.com/"
	}

	def localProxy(self,param):
		return [200, "video/MP2T", action, ""]
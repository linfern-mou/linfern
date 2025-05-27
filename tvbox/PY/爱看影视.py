# -*- coding: utf-8 -*-
import base64
import re
import sys
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from pyquery import PyQuery as pq
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def __init__(self):
        self.host = 'https://www.akysw.pro'
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Referer': self.host
        }

    # 基础方法（保持原样）
    def getName(self):
        return "示例爬虫"

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def destroy(self):
        pass

    def getpq(self, text):
        try:
            return pq(text)
        except Exception as e:
            print(f"PyQuery解析异常: {str(e)}")
            return pq(text.encode('utf-8'))

    # 核心功能方法
    def homeContent(self, filter):
    html = self.fetch(self.host, headers=self.headers).text
    doc = self.getpq(html)
    
    result = {
        'class': [],  # 分类列表
        'list': []    # 视频列表
    }

    # 解析分类导航（从头部导航栏获取）
    for item in doc('.head-nav li.swiper-slide a').items():
        if item.attr('href') and not item.attr('href').startswith('javascript'):
            result['class'].append({
                'type_name': item.text().strip(),
                'type_id': item.attr('href')
            })

    # 解析快速分类导航（从qy-type-list获取）
    for item in doc('.qy-homepage-tab-wrap .qy-top a').items():
        result['class'].append({
            'type_name': item.find('.this-name').text(),
            'type_id': item.attr('href')
        })

    # 解析热播推荐区域
    for item in doc('.public-r .public-list-box').items():
        vod_info = {
            'vod_id': item.find('a').attr('href'),
            'vod_name': item.find('.time-title').text(),
            'vod_pic': item.find('img.lazy').attr('data-src'),
            'vod_remarks': item.find('.public-list-subtitle').text()
        }
        if vod_info['vod_id']:  # 确保有有效链接
            result['list'].append(vod_info)

    # 解析2025最新电影区域
    for item in doc('.vod-list-b .public-list-box').items():
        vod_info = {
            'vod_id': item.find('a').attr('href'),
            'vod_name': item.find('.time-title').text(),
            'vod_pic': item.find('img.lazy').attr('data-src'),
            'vod_remarks': item.find('.public-prt').text() + '|' + item.find('.public-list-subtitle').text()
        }
        if vod_info['vod_id']:
            result['list'].append(vod_info)

    return result


    def detailContent(self, ids):
        html = self.fetch(ids[0], headers=self.headers).text
        doc = self.getpq(html)

        vod = {
            'vod_name': doc('h1.title').text(),
            'vod_pic': doc('.cover img').attr('src'),
            'vod_content': doc('.description').text(),
            'vod_play_from': '默认播放源',
            'vod_play_url': ''
        }

        # 示例：解析播放地址（需根据实际HTML调整）
        play_list = []
        for item in doc('.playlist a').items():
            play_list.append(f"{item.text()}${item.attr('href')}")
        
        vod['vod_play_url'] = "#".join(play_list)
        return {'list': [vod]}

    # 其他必要方法（保持框架完整）
    def searchContent(self, key, quick):
        return {'list': []}

    def playerContent(self, flag, id, vipFlags):
        return {
            "parse": 0,
            "url": "",
            "header": self.headers
        }

    def localProxy(self, param):
        return None
# -*- coding: utf-8 -*-
import base64
import sys
import time
import json
import requests
from datetime import datetime
from bs4 import BeautifulSoup
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return "515001TV_Enhanced"

    def init(self, extend):
        self.extend = extend
        try:
            self.extendDict = json.loads(extend)
        except:
            self.extendDict = {}

        proxy = self.extendDict.get('proxy', None)
        if proxy is None:
            self.is_proxy = False
        else:
            self.proxy = proxy
            self.is_proxy = True

    def liveContent(self, url):
        cookies = {
            '_ga': 'GA1.1.782627561.1745936696',
            '_oredge_rl': 'u1ORyxILkguVwZ3LWQNJTpqceYPzrL/Cgugwu74xDwA=',
            'dailyMessageShown515': 'shown',
            '_ga_F2ET4TBC70': 'GS2.1.s1747232930$o3$g1$t1747233259$j0$l0$h0',
        }

        headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'zh-CN,zh;q=0.9',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        }

        try:
            # 获取主页面
            response = requests.get('https://www.515001.tv/', cookies=cookies, headers=headers, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

            m3u_content = ['#EXTM3U']
            
            # 查找所有比赛容器
            match_containers = soup.find_all('div', class_='match-container') or soup.find_all('div', class_='match-item')
            
            for container in match_containers:
                # 提取基础信息
                event_name = container.find('em').get_text(strip=True) if container.find('em') else '未知赛事'
                time_info = container.find('i').get_text(strip=True) if container.find('i') else ''
                home_team = container.find('div', class_='zhudui').get_text(strip=True) if container.find('div', class_='zhudui') else '主队'
                away_team = container.find('div', class_='kedui').get_text(strip=True) if container.find('div', class_='kedui') else '客队'
                
                base_title = f"[{event_name}]{home_team} VS {away_team} {time_info}"
                
                # 查找所有线路按钮 - 根据实际页面结构调整
                stream_buttons = container.find_all('a', class_='stream-btn') or \
                                container.find_all('button', class_='stream-option') or \
                                container.find_all('div', class_='stream-links')
                
                # 如果没有找到明确的线路按钮，使用主链接
                if not stream_buttons:
                    main_link = container.find('a', class_='clearfix')
                    if main_link and main_link.get('href'):
                        stream_buttons = [{'url': main_link.get('href'), 'name': '主线路'}]
                
                # 为每个线路生成条目
                for idx, btn in enumerate(stream_buttons, 1):
                    stream_url = btn.get('href') or btn.get('data-src') or btn.get('data-url')
                    if not stream_url:
                        continue
                    
                    # 处理相对URL
                    if not stream_url.startswith('http'):
                        stream_url = f"https://www.515001.tv{stream_url}" if stream_url.startswith('/') else f"https://www.515001.tv/{stream_url}"
                    
                    # 获取线路名称
                    stream_name = btn.get_text(strip=True) or f"线路{idx}"
                    
                    # 添加到M3U
                    m3u_content.append(f'#EXTINF:-1 tvg-name="{base_title}" group-title="515001",{base_title} - {stream_name}')
                    m3u_content.append(f"video://{stream_url}")
            
            return '\n'.join(m3u_content)
            
        except Exception as e:
            return f"#EXTM3U\n# 错误：{str(e)}"

    # 保留其他原有方法不变
    def homeContent(self, filter): return {}
    def homeVideoContent(self): return {}
    def categoryContent(self, cid, page, filter, ext): return {}
    def detailContent(self, did): return {}
    def searchContent(self, key, quick, page='1'): return {}
    def searchContentPage(self, keywords, quick, page): return {}
    def playerContent(self, flag, pid, vipFlags): return {}
    
    def localProxy(self, params):
        if params['type'] == "m3u8":
            return self.proxyM3u8(params)
        if params['type'] == "ts":
            return self.get_ts(params)
        return [302, "text/plain", None, {'Location': 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4'}]
    
    def proxyM3u8(self, params):
        pid = params['pid']
        info = pid.split(',')
        a = info[0]
        b = info[1]
        c = info[2]
        timestamp = int(time.time() / 4 - 355017625)
        t = timestamp * 4
        m3u8_text = f'#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:{timestamp}\n'
        for i in range(10):
            url = f'https://ntd-tgc.cdn.hinet.net/live/pool/{a}/litv-pc/{a}-avc1_6000000={b}-mp4a_134000_zho={c}-begin={t}0000000-dur=40000000-seq={timestamp}.ts'
            if self.is_proxy:
                url = f'http://127.0.0.1:9978/proxy?do=py&type=ts&url={self.b64encode(url)}'
            m3u8_text += f'#EXTINF:4,\n{url}\n'
            timestamp += 1
            t += 4
        return [200, "application/vnd.apple.mpegurl", m3u8_text]

    def get_ts(self, params):
        url = self.b64decode(params['url'])
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, stream=True, proxies=self.proxy)
        return [206, "application/octet-stream", response.content]

    def destroy(self):
        return '正在Destroy'

    def b64encode(self, data):
        return base64.b64encode(data.encode('utf-8')).decode('utf-8')

    def b64decode(self, data):
        return base64.b64decode(data.encode('utf-8')).decode('utf-8')

if __name__ == '__main__':
    spider = Spider()
    spider.init("{}")
    print(spider.liveContent(""))
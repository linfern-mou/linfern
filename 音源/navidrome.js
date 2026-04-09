"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const CryptoJs = require("crypto-js");
const he = require("he");
const qs = require('qs');
const pageSize = 50;
const LYRICS_API_BASE_URL = 'https://lrc.xms.mx';
const ALL_SONGS_TAG = { id: 'navidrome__all_songs', title: '所有歌曲' };
const QQ_MATCH_RESULT_COUNT = 80;
const QQ_IMPORT_CONCURRENCY = 5;
const NCM_IMPORT_CONCURRENCY = 10;
const NCM_MATCH_RESULT_COUNT = 80;
const DURATION_TOLERANCE_SECONDS = 3;

function getUserAgent() {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
        if (/Android/i.test(navigator.userAgent)) return 'Mozilla/5.0 (Linux; Android 14.0; Mobile; rv:112.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 MusicFree/0.5.1';
        if (/Windows/i.test(navigator.userAgent)) return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 MusicFree/0.0.7';
        if (/Linux/i.test(navigator.userAgent)) return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 MusicFree/0.0.7';
        return 'MusicFree/Web';
    }
    if (typeof process !== 'undefined' && process.platform) {
        if (process.platform === 'win32') return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 MusicFree/0.0.7';
        if (process.platform === 'android') return 'Mozilla/5.0 (Linux; Android 14.0; Mobile; rv:112.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 MusicFree/0.5.1';
        if (process.platform === 'linux') return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 MusicFree/0.0.7';
        return 'MusicFree/' + process.platform;
    }
    return 'MusicFree/Unknown';
}

function getUserVariables() {
    return (env?.getUserVariables && env.getUserVariables()) || {};
}

function getAuthParams() {
    const { username, password } = getUserVariables();
    const salt = Math.random().toString(16).slice(2);
    const token = CryptoJs.MD5(`${password}${salt}`).toString(CryptoJs.enc.Hex);
    return { u: username, s: salt, t: token, c: "MusicFree", v: "1.16.1", f: "json" };
}

function normalize(str) {
    if (!str) return '';
    let cleanedStr = str.replace(/(?:\s*[(（\[【].*?[)）\]】]\s*)$/, '');
    return cleanedStr
        .replace(/[\s\p{P}\p{S}\u200B-\u200D\uFEFF]/gu, '')
        .toLowerCase();
}

function deduplicateTracks(tracks) {
    const seen = new Set();
    return tracks.filter(track => {
        if (!track.id) return false;
        if (seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
    });
}

let nativeTokenCache = { token: null, time: 0 };

async function getNativeToken() {
    const { url, username, password } = getUserVariables();
    if (!url || !username || !password) return null;
    const now = Date.now();
    if (nativeTokenCache.token && now - nativeTokenCache.time > 3 * 60 * 1000 && now - nativeTokenCache.time < 4 * 60 * 1000) {
        sendKeepalive(nativeTokenCache.token).catch(() => {});
    }
    if (nativeTokenCache.token && now - nativeTokenCache.time < 4 * 60 * 1000) return nativeTokenCache.token;
    try {
        const response = await axios_1.default.post(`${normalizeUrl(url)}/auth/login`, { username, password }, {
            headers: { 'Content-Type': 'application/json', 'User-Agent': getUserAgent() }, timeout: 10000
        });
        if (response.data && response.data.token) {
            nativeTokenCache = { token: response.data.token, time: now };
            return response.data.token;
        }
        return null;
    } catch { return null; }
}

function normalizeUrl(url) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = `http://${url}`;
    return url.replace(/\/+$/, "");
}

async function httpGet(urlPath, params) {
    const { url } = getUserVariables();
    const authParams = getAuthParams();
    const fullUrl = `${normalizeUrl(url)}/rest/${urlPath}`;
    try {
        const response = await axios_1.default.get(fullUrl, {
            params: { ...authParams, ...params },
            timeout: 20000,
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            headers: { 'User-Agent': getUserAgent() }
        });
        if (response.data?.['subsonic-response']?.status === 'failed') {
            const error = response.data['subsonic-response'].error;
            if (error.code === 40) throw new Error(`Navidrome 认证失败: 用户名或密码错误 (代码: 40)`);
            if (error.code === 70 && urlPath === 'getSong') throw new Error('ID无效');
            throw new Error(`Navidrome API 错误: ${error.message} (代码: ${error.code})`);
        }
        if (response.status < 200 || response.status >= 300) throw new Error(`Navidrome 服务器请求失败，HTTP 状态码: ${response.status}`);
        return response.data;
    } catch (error) {
        if (error instanceof Error && (error.message.startsWith('Navidrome') || error.message.startsWith('无法') || error.message === 'ID无效')) throw error;
        else throw new Error(`无法连接到 Navidrome 服务器或请求失败: ${error.message}`);
    }
}

async function httpGetNative(path, params) {
    const { url } = getUserVariables();
    const nativeToken = await getNativeToken();
    if (!nativeToken) throw new Error("无法获取 Navidrome Native API Token，请检查用户名和密码");
    const fullUrl = `${normalizeUrl(url)}/api/${path}`;
    try {
        const response = await axios_1.default.get(fullUrl, {
            params: params,
            headers: {
                'x-nd-authorization': `Bearer ${nativeToken}`,
                'User-Agent': getUserAgent()
            },
            timeout: 20000,
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
        });
        if (response.status < 200 || response.status >= 300) throw new Error(`Navidrome Native API 请求失败，HTTP 状态码: ${response.status}`);
        return { data: response.data, headers: response.headers };
    } catch (error) {
        throw new Error(`无法连接到 Navidrome Native API 或请求失败: ${error.message}`);
    }
}

function generateCoverArtUrl(coverArtId) {
    if (!coverArtId) return null;
    const { url } = getUserVariables();
    const authParams = getAuthParams();
    const coverUrl = new URL(`${normalizeUrl(url)}/rest/getCoverArt`);
    Object.entries(authParams).forEach(([key, value]) => coverUrl.searchParams.append(key, value));
    coverUrl.searchParams.append('id', String(coverArtId));
    return coverUrl.toString();
}

function formatMusicItem(navidromeSong) {
    return {
        id: String(navidromeSong.id),
        title: navidromeSong.title || "未知歌曲",
        artist: navidromeSong.artist || "未知艺术家",
        album: navidromeSong.album || "未知专辑",
        artwork: generateCoverArtUrl(navidromeSong.hasCoverArt ? navidromeSong.id : navidromeSong.albumId),
        duration: navidromeSong.duration,
        suffix: navidromeSong.suffix,
        artistId: navidromeSong.artistId,
        albumId: navidromeSong.albumId,
        _source: 'navidrome'
    };
}

function formatPlaylistMusicItemNative(navidromeTrack) {
    return {
        id: String(navidromeTrack.mediaFileId),
        title: navidromeTrack.title || "未知歌曲",
        artist: navidromeTrack.artist || "未知艺术家",
        album: navidromeTrack.album || "未知专辑",
        artwork: generateCoverArtUrl(navidromeTrack.hasCoverArt ? navidromeTrack.mediaFileId : navidromeTrack.albumId),
        duration: navidromeTrack.duration,
        suffix: navidromeTrack.suffix,
        artistId: navidromeTrack.artistId,
        albumId: navidromeTrack.albumId,
        _source: 'navidrome'
    };
}

function formatAlbumItem(navidromeAlbum) {
    return {
        id: String(navidromeAlbum.id),
        title: navidromeAlbum.name || navidromeAlbum.title || "未知专辑",
        artist: navidromeAlbum.artist || "未知艺术家",
        artwork: generateCoverArtUrl(navidromeAlbum.embedArtPath ? navidromeAlbum.id : `al-${navidromeAlbum.id}`),
        description: `歌曲数: ${navidromeAlbum.songCount || '?'}`,
        artistId: navidromeAlbum.artistId,
        songCount: navidromeAlbum.songCount
    };
}

function formatArtistItem(navidromeArtist) {
    return {
        id: String(navidromeArtist.id),
        name: navidromeArtist.name || "未知艺术家",
        avatar: generateCoverArtUrl(navidromeArtist.id ? `ar-${navidromeArtist.id}` : null),
        platform: 'navidrome'
    };
}

function formatSheetItem(playlist, username = "Navidrome 用户") {
    const id = String(playlist.id);
    const title = playlist.name || "未知播放列表";
    const owner = playlist.ownerName || playlist.owner || username;
    const artwork = generateCoverArtUrl(id ? `pl-${id}` : null);
    const songCount = playlist.songCount ?? '?';
    const duration = playlist.duration ?? 0;
    const description = `歌曲: ${songCount}, 时长: ${Math.round(duration / 60)}分钟`;
    const playCount = playlist.playCount;

    return { id, title, artist: owner, artwork, description, playCount, songCount };
}

function formatQQImportItem(qqSong) {
    var _a, _b, _c;
    const albummid = qqSong.albummid || ((_b = qqSong.album) ?? {}).mid;
    const albumname = qqSong.albumname || ((_c = qqSong.album) ?? {}).title;
    return {
        id: `qq-tmp-${qqSong.id || qqSong.songid}`,
        songmid: qqSong.mid || qqSong.songmid,
        title: qqSong.title || qqSong.songname,
        artist: Array.isArray(qqSong.singer) ? qqSong.singer.map((s)=>s.name).join("/") : "未知艺术家",
        album: albumname,
        artwork: albummid ? `https://y.gtimg.cn/music/photo_new/T002R800x800M000${albummid}.jpg` : undefined,
        duration: qqSong.interval,
        albummid: albummid,
        _qqId: String(qqSong.id || qqSong.songid)
    };
}

function formatNcmMusicItem(ncmSong) {
    const album = ncmSong.al || ncmSong.album;
    const artists = ncmSong.ar || ncmSong.artists;
    const durationSeconds = ncmSong.duration ? Math.round(ncmSong.duration / 1000) : (ncmSong.dt ? Math.round(ncmSong.dt / 1000) : undefined);
    return {
        id: `ncm-tmp-${String(ncmSong.id)}`,
        title: ncmSong.name || "未知歌曲",
        artist: (Array.isArray(artists) && artists.length > 0) ? artists.map(a => a.name).join('/') : "未知艺术家",
        album: album?.name || "未知专辑",
        artwork: album?.picUrl,
        duration: durationSeconds,
        _ncmId: String(ncmSong.id)
    };
}

async function searchMusic(query, page, count = pageSize) {
    const start = (page - 1) * count;
    const end = start + count;
    const response = await httpGetNative('song', { title: query, _start: start, _end: end });
    const songs = response.data ?? [];
    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const isEnd = (start + songs.length) >= total;
    return { isEnd: isEnd, data: songs.map(formatMusicItem) };
}

async function searchAlbum(query, page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const response = await httpGetNative('album', { name: query, _start: start, _end: end });
    const albums = response.data ?? [];
    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const isEnd = (start + albums.length) >= total;
    return { isEnd: isEnd, data: albums.map(formatAlbumItem) };
}

async function searchArtist(query, page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const response = await httpGetNative('artist', { name: query, _start: start, _end: end });
    const artists = response.data ?? [];
    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const isEnd = (start + artists.length) >= total;
    return { isEnd: isEnd, data: artists.map(formatArtistItem) };
}

async function searchSheet(query, page, username) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const params = { _start: start, _end: end, _sort: 'name', _order: 'ASC' };
    if (query && query.trim()) {
        params.name = query.trim();
    }
    const response = await httpGetNative('playlist', params);
    const playlists = response.data ?? [];
    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const isEnd = (start + playlists.length) >= total;
    return { isEnd: isEnd, data: playlists.map(p => formatSheetItem(p, username)).filter(p => p !== null) };
}

async function getAlbumInfoApi(albumItem, page) {
    if (page > 1) return { isEnd: true, musicList: [] };
    const data = await httpGet('getAlbum', { id: albumItem.id });
    const albumData = data?.['subsonic-response']?.album;
    const songs = albumData?.song ?? [];
    const supplementaryAlbumData = formatAlbumItem(albumData || { id: albumItem.id, title: albumItem.title });
    if (albumData?.artist && albumData?.year) supplementaryAlbumData.description = `${albumData.artist} - ${albumData.year}`;
    else if (albumData?.artist) supplementaryAlbumData.description = albumData.artist;
    return { isEnd: true, musicList: songs.map(formatMusicItem), albumItem: supplementaryAlbumData };
}

async function getMusicSheetInfoApi(sheetItem, page) {
    if (sheetItem.id === ALL_SONGS_TAG.id) return await getAllSongsApi(page);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const response = await httpGetNative(`playlist/${sheetItem.id}/tracks`, { _start: start, _end: end });
    const tracks = response.data ?? [];
    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const isEnd = (start + tracks.length) >= total;
    let supplementarySheetData = {};
    if (page === 1) {
        const userVariables = env?.getUserVariables() ?? {};
        const username = userVariables.username || "Navidrome 用户";
        try {
            const playlistInfoResponse = await httpGetNative(`playlist/${sheetItem.id}`, {});
            const playlistData = playlistInfoResponse.data;
            supplementarySheetData = formatSheetItem(playlistData || { id: sheetItem.id, name: sheetItem.title }, username);
            if (playlistData?.comment) supplementarySheetData.description = playlistData.comment;
        } catch(e) {
             supplementarySheetData = { id: sheetItem.id, title: sheetItem.title, artist: username };
        }
    }
    return { isEnd: isEnd, musicList: tracks.map(formatPlaylistMusicItemNative), sheetItem: page === 1 ? supplementarySheetData : undefined };
}

async function getAllSongsApi(page) {
    const offset = (page - 1) * pageSize;
    try {
        const response = await httpGetNative('song', { _start: offset, _end: offset + pageSize, _sort: 'title', _order: 'ASC' });
        const songs = response.data ?? [];
        const total = parseInt(response.headers['x-total-count'] || '0', 10);
        const isEnd = (offset + songs.length) >= total;
        return {
            isEnd: isEnd,
            musicList: songs.map(formatMusicItem),
            sheetItem: page === 1 ? { id: ALL_SONGS_TAG.id, title: ALL_SONGS_TAG.title, description: "服务器上的全部音乐" } : undefined
        };
    } catch(e) {
        return { isEnd: true, musicList: [] };
    }
}

function parseStructuredLyrics(structuredLyrics) {
    if (!structuredLyrics || !Array.isArray(structuredLyrics) || structuredLyrics.length === 0) {
        return null;
    }
    const syncedLyrics = structuredLyrics.find(l => l.synced === true && Array.isArray(l.line));
    if (!syncedLyrics) {
        return null;
    }
    let lrc = '';
    for (const line of syncedLyrics.line) {
        if (typeof line.start === 'number' && typeof line.value === 'string') {
            const timeMs = line.start;
            const totalSeconds = Math.floor(timeMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const milliseconds = Math.floor((timeMs % 1000) / 10);
            const timeStr = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}]`;
            lrc += `${timeStr}${line.value}\n`;
        }
    }
    return lrc.trim() || null;
}

async function getLyricApi(musicItem) {
    if (!musicItem || !musicItem.id) return null;
    try {
        const response = await httpGet('getLyricsBySongId', { id: musicItem.id });
        const lyricsList = response?.['subsonic-response']?.lyricsList;
        const structuredLyrics = lyricsList?.structuredLyrics;
        const parsedLrc = parseStructuredLyrics(structuredLyrics);
        if (parsedLrc) {
            return { rawLrc: parsedLrc };
        }
    } catch (e) {}
    if (!musicItem.title) return null;
    try {
        const params = { title: musicItem.title };
        if (musicItem.artist && !['unknown artist', 'various artists'].includes(musicItem.artist.toLowerCase())) params.artist = musicItem.artist;
        if (musicItem.album && !['unknown album'].includes(musicItem.album.toLowerCase())) params.album = musicItem.album;
        const response = await axios_1.default.get(`${LYRICS_API_BASE_URL}/lyrics`, {
            params, responseType: 'text', timeout: 10000, headers: { 'User-Agent': getUserAgent() }
        });
        if (response.data && typeof response.data === 'string' && response.data.trim()) {
            if (!response.data.toLowerCase().includes('not found') && response.data.length > 10)
                return { rawLrc: he.decode(response.data) };
        }
    } catch {}
    return null;
}

async function scrobbleApi(musicItem, submission = false) {
    const { url } = getUserVariables();
    const authParams = getAuthParams();
    const scrobbleUrl = `${normalizeUrl(url)}/rest/scrobble`;
    try {
        await axios_1.default.get(scrobbleUrl, {
            params: {
                ...authParams,
                id: String(musicItem.id),
                submission: submission ? "true" : "false"
            },
            timeout: 10000,
            headers: { 'User-Agent': getUserAgent() }
        });
        return true;
    } catch (e) {
        return false;
    }
}

let lastPlayedMusicItem = null;

async function tryAutoFixMusicId(musicItem) {
    if (!musicItem || !musicItem.title || !musicItem.artist) return null;
    const query = `${musicItem.title} ${musicItem.artist}`;
    const { data } = await searchMusic(query, 1, 5);
    let bestMatch = data.find(item =>
        item.title === musicItem.title &&
        item.artist === musicItem.artist &&
        (!musicItem.duration || Math.abs(item.duration - musicItem.duration) < DURATION_TOLERANCE_SECONDS)
    );
    if (bestMatch) {
        return { ...musicItem, id: bestMatch.id };
    }
    const titleOnlyMatches = data.filter(item => item.title === musicItem.title);
    if (titleOnlyMatches.length > 0 && musicItem.duration) {
         bestMatch = titleOnlyMatches.find(item =>
             Math.abs(item.duration - musicItem.duration) < (DURATION_TOLERANCE_SECONDS / 2)
         );
         if (bestMatch) {
             console.warn(`歌曲 "${musicItem.title}" ID 失效，已通过标题和严格时长匹配进行修复 (新ID: ${bestMatch.id})`);
             return { ...musicItem, id: bestMatch.id };
         }
    }
    return null;
}

async function getMediaSourceApi(musicItem, quality) {
    // if (musicItem.suffix && musicItem.suffix.toLowerCase() === 'm4a') {
        // return null;
    // }
    const { url } = getUserVariables();
    const authParams = getAuthParams();
    let currentMusicId = String(musicItem.id);
    let effectiveMusicItem = musicItem;
    if (musicItem._source === 'navidrome_qq_artwork' || musicItem._source === 'navidrome_ncm_artwork') {
        try {
             await httpGet('getSong', { id: currentMusicId });
        } catch (e) {
            if (e.message === 'ID无效') {
                const fixedItem = await tryAutoFixMusicId(musicItem);
                if (fixedItem && fixedItem.id) {
                    currentMusicId = String(fixedItem.id);
                    effectiveMusicItem = fixedItem;
                } else {
                    return null;
                }
            } else {
                 return null;
            }
        }
    }
    if (lastPlayedMusicItem && lastPlayedMusicItem.id !== effectiveMusicItem.id) {
        scrobbleApi(lastPlayedMusicItem, true).catch(() => {});
    }
    lastPlayedMusicItem = effectiveMusicItem;
    const streamUrl = new URL(`${normalizeUrl(url)}/rest/stream`);
    Object.entries(authParams).forEach(([key, value]) => streamUrl.searchParams.append(key, value));
    streamUrl.searchParams.append('id', currentMusicId);
    return { url: streamUrl.toString() };
}

async function getMusicInfoApi(musicItem) {
    if ((musicItem._source === 'navidrome_qq_artwork' || musicItem._source === 'navidrome_ncm_artwork') && musicItem.artwork) {
         return { artwork: musicItem.artwork };
    }
    if (musicItem.artwork && typeof musicItem.artwork === 'string' && musicItem.artwork.startsWith('mf-')) {
        return { artwork: musicItem.artwork };
    }

    if (musicItem.id && (musicItem._source === 'navidrome' || musicItem._source === 'navidrome_qq_artwork' || musicItem._source === 'navidrome_ncm_artwork')) {
        const coverId = musicItem.hasCoverArt ? musicItem.id : (musicItem.albumId ? `al-${musicItem.albumId}` : musicItem.id);
        const navidromeCover = generateCoverArtUrl(coverId);
        if (navidromeCover) return { artwork: navidromeCover };
    }

    if (musicItem.title) {
        try {
            const params = new URLSearchParams();
            params.append('title', musicItem.title);
            if (musicItem.artist && !['unknown artist', 'various artists'].includes(musicItem.artist.toLowerCase())) params.append('artist', musicItem.artist);
            if (musicItem.album && !['unknown album'].includes(musicItem.album.toLowerCase())) params.append('album', musicItem.album);
            const coverApiUrl = `${LYRICS_API_BASE_URL}/cover?${params.toString()}`;
             const response = await axios_1.default.get(coverApiUrl, { timeout: 5000 });
             if (response.status === 200) {
                 return { artwork: coverApiUrl };
             }
        } catch {}
    }
    
    return null;
}

async function getRecommendSheetsByTagApi(tag, page, username) {
    const nativeToken = await getNativeToken();
    if (nativeToken) {
        sendKeepalive(nativeToken).catch(() => {});
    }
    if (tag.id === '') {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        let fetchedPlaylists = [];
        let isPlaylistEnd = true;
        let totalPlaylists = 0;
        try {
            const response = await httpGetNative('playlist', { _start: start, _end: end, _sort: 'name', _order: 'ASC' });
            fetchedPlaylists = response.data ?? [];
            const totalHeader = response.headers['x-total-count'];
            totalPlaylists = totalHeader ? parseInt(totalHeader, 10) : 0;
            isPlaylistEnd = (start + fetchedPlaylists.length) >= totalPlaylists || fetchedPlaylists.length < pageSize;
        } catch (e) {
            console.error("获取播放列表失败:", e);
            isPlaylistEnd = true;
            fetchedPlaylists = [];
        }
        let returnData = fetchedPlaylists.map(p => formatSheetItem(p, username)).filter(p => p !== null);
        if (page === 1) {
            const fakeSheet = {
                 id: ALL_SONGS_TAG.id,
                 title: ALL_SONGS_TAG.title,
                 artist: username || "Navidrome",
                 artwork: 'https://p1.music.126.net/oT-RHuPBJiD7WMoU7WG5Rw==/109951166093489621.jpg',
                 description: "浏览服务器上的所有歌曲"
            };
            returnData.unshift(fakeSheet);
        }
        return { isEnd: isPlaylistEnd, data: returnData };
    }
    else {
        return { isEnd: true, data: [] };
    }
}

async function getTopListsApi() {
    const lists = [
        { id: 'navidrome_toplist_starred', title: '我的收藏' },
        { id: 'navidrome_toplist_random', title: '随机播放' },
        { id: 'navidrome_toplist_newest', title: '最新添加' },
        { id: 'navidrome_toplist_frequent', title: '播放最多' },
        { id: 'navidrome_toplist_recent', title: '最近播放' }
    ];
    return [{ title: "Navidrome 排行榜", data: lists }];
}

async function getTopListDetailApi(topListItem, page) {
    try {
        const start = (page - 1) * pageSize;
        const end = page * pageSize;
        if (topListItem.id === 'navidrome_toplist_starred') {
            if (page > 1) return { isEnd: true, musicList: [] };
            const data = await httpGet('getStarred', {});
            const songs = data?.['subsonic-response']?.starred?.song ?? [];
            return { isEnd: true, musicList: songs.map(formatMusicItem) };
        } else if (topListItem.id === 'navidrome_toplist_random') {
            const data = await httpGet('getRandomSongs', { size: pageSize });
            const songs = data?.['subsonic-response']?.randomSongs?.song ?? [];
            return { isEnd: true, musicList: songs.map(formatMusicItem) };
        } else {
            let sortField = '';
            let sortOrder = 'DESC';
            switch (topListItem.id) {
                case 'navidrome_toplist_newest': sortField = 'createdAt'; break;
                case 'navidrome_toplist_frequent': sortField = 'play_count'; break;
                case 'navidrome_toplist_recent': sortField = 'play_date'; break;
                default:
                    return { isEnd: true, musicList: [] };
            }
            const response = await httpGetNative('song', {
                _sort: sortField,
                _order: sortOrder,
                _start: start,
                _end: end
            });
            const songs = response.data ?? [];
            const total = parseInt(response.headers['x-total-count'] || '0', 10);
            const isEnd = (start + songs.length) >= total;
            return { isEnd, musicList: songs.map(formatMusicItem) };
        }
    } catch (e) {
        return { isEnd: true, musicList: [] };
    }
}

async function sendKeepalive(nativeToken) {
    const { url } = getUserVariables();
    if (!url || !nativeToken) return false;
    const keepaliveUrl = `${normalizeUrl(url)}/api/keepalive/keepalive`;
    try {
        const response = await axios_1.default.get(keepaliveUrl, {
            headers: {
                'x-nd-authorization': `Bearer ${nativeToken}`,
                'User-Agent': getUserAgent()
            },
            timeout: 10000
        });
        return response.status >= 200 && response.status < 300;
    } catch (error) { return false; }
}

async function getQQPlaylistDetails(id) {
    try {
        const result = (await axios_1.default({
            url: `http://i.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&utf8=1&disstid=${id}&loginUin=0`,
            headers: { Referer: "https://y.qq.com/n/yqq/playlist", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36", Cookie: "uin=" },
            method: "get",
            timeout: 15000
        })).data;
        const jsonString = result.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, "");
        const res = JSON.parse(jsonString);
        if (!res.cdlist || res.cdlist.length === 0) throw new Error("QQ 音乐 API 未返回有效的歌单列表。");
        const playlistData = res.cdlist[0];
        const name = he.decode(playlistData.dissname || `QQ 音乐歌单 ${id}`);
        const cover = playlistData.logo;
        const songs = (playlistData.songlist || []).map(formatQQImportItem);
        return { name, cover, songs };
    } catch (e) {
        throw new Error(`获取 QQ 音乐歌单信息失败 (ID: ${id}): ${e.message}`);
    }
}

async function findAndMergeQQTrackOnNavidrome(qqTrack) {
    const cleanedQQTitle = (qqTrack.title || '').replace(/(?:\s*[(（\[【].*?[)）\]】]\s*)$/, '');
    const queryWithArtist = `${cleanedQQTitle} ${qqTrack.artist}`;
    try {
        let searchResult = await searchMusic(queryWithArtist, 1, QQ_MATCH_RESULT_COUNT);
        if (!searchResult.data || searchResult.data.length === 0) {
            searchResult = await searchMusic(cleanedQQTitle, 1, QQ_MATCH_RESULT_COUNT);
            if (!searchResult.data || searchResult.data.length === 0) return null;
        }
        let tier1Match = null;
        let tier2Match = null;
        const normalizedCleanedQQTitle = normalize(cleanedQQTitle);
        const normalizedQQArtist = normalize(qqTrack.artist);
        for (const naviTrack of searchResult.data) {
            const normalizedNaviTitle = normalize(naviTrack.title);
            const normalizedNaviArtist = normalize(naviTrack.artist);
            const titleMatch = normalizedNaviTitle === normalizedCleanedQQTitle;
            if (!titleMatch) continue;
            const artistMatch = normalizedNaviArtist === normalizedQQArtist;
            const durationMatch = typeof naviTrack.duration === 'number' && typeof qqTrack.duration === 'number'
                ? Math.abs(naviTrack.duration - qqTrack.duration) <= DURATION_TOLERANCE_SECONDS
                : true;
            if (artistMatch) {
                if (durationMatch) {
                    tier1Match = naviTrack;
                    break;
                } else if (!tier1Match) {
                    tier1Match = naviTrack;
                }
            } else if (durationMatch && !tier1Match) {
                 if (!tier2Match) {
                     tier2Match = naviTrack;
                 }
            }
        }
        const bestMatch = tier1Match || tier2Match;
        if (bestMatch) {
            return {
                id: bestMatch.id,
                title: bestMatch.title,
                artist: bestMatch.artist,
                album: bestMatch.album,
                artwork: qqTrack.artwork,
                duration: bestMatch.duration,
                suffix: bestMatch.suffix,
                _source: 'navidrome_qq_artwork'
            };
        } else {
            return null;
        }
    } catch (e) {
         console.error(`Error finding QQ track ${qqTrack.title}: ${e}`);
         return null;
    }
}

async function processQQPlaylistImport(id) {
    const { name: qqPlaylistName, songs: qqTracks } = await getQQPlaylistDetails(id);
    if (!qqTracks || qqTracks.length === 0) return { playlistName: qqPlaylistName || `QQ 歌单 ${id}`, matchedTracks: [] };
    const matchedNavidromeTracks = [];
    const searchPromises = [];
    for (let i = 0; i < qqTracks.length; i++) {
        const qqTrack = qqTracks[i];
        const searchPromise = findAndMergeQQTrackOnNavidrome(qqTrack).catch(()=>null);
        searchPromises.push(searchPromise);
        if (searchPromises.length >= QQ_IMPORT_CONCURRENCY || i === qqTracks.length - 1) {
            const results = await Promise.all(searchPromises);
            results.forEach(track => { if (track) matchedNavidromeTracks.push(track); });
            searchPromises.length = 0;
        }
    }
    return { playlistName: qqPlaylistName, matchedTracks: matchedNavidromeTracks };
}

async function getNcmTrackDetails(trackIds) {
    if (!trackIds || trackIds.length === 0) return [];
    const ncmHeaders = { Referer: "https://music.163.com/", Origin: "https://music.163.com/", "User-Agent": "Mozilla/5.0" };
    const apiUrl = `https://music.163.com/api/song/detail/?ids=[${trackIds.join(",")}]`;
    try {
        const response = await axios_1.default.get(apiUrl, { headers: ncmHeaders, timeout: 15000 });
        if (response.data?.songs?.length > 0) return response.data.songs.map(formatNcmMusicItem);
        return [];
    } catch (e) { return []; }
}
async function getNcmPlaylistDetails(id) {
    const ncmHeaders = { Referer: "https://music.163.com/", Origin: "https://music.163.com/", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36" };
    const apiUrl = `https://music.163.com/api/v3/playlist/detail?id=${id}&n=100000`;
    try {
        const response = await axios_1.default.get(apiUrl, { headers: ncmHeaders, timeout: 15000 });
        const playlistData = response.data?.playlist;
        if (playlistData && playlistData.trackIds) {
            const trackIds = playlistData.trackIds.map((_) => _.id);
            const name = he.decode(playlistData.name || `网易云歌单 ${id}`);
            const cover = playlistData.coverImgUrl;
            return { trackIds, name, cover };
        } else throw new Error("无法获取网易云歌单详情。");
    } catch (e) { throw new Error(`获取网易云歌单信息失败: ${e.message}`); }
}

async function findAndMergeNcmTrackOnNavidrome(ncmTrack) {
    const cleanedNcmTitle = (ncmTrack.title || '').replace(/(?:\s*[(（\[【].*?[)）\]】]\s*)$/, '');
    const queryWithArtist = `${cleanedNcmTitle} ${ncmTrack.artist}`;
    try {
        let searchResult = await searchMusic(queryWithArtist, 1, NCM_MATCH_RESULT_COUNT);
        if (!searchResult.data || searchResult.data.length === 0) {
            searchResult = await searchMusic(cleanedNcmTitle, 1, NCM_MATCH_RESULT_COUNT);
            if (!searchResult.data || searchResult.data.length === 0) return null;
        }
        let tier1Match = null;
        let tier2Match = null;
        const normalizedCleanedNcmTitle = normalize(cleanedNcmTitle);
        const normalizedNcmArtist = normalize(ncmTrack.artist);
        for (const naviTrack of searchResult.data) {
            const normalizedNaviTitle = normalize(naviTrack.title);
            const normalizedNaviArtist = normalize(naviTrack.artist);
            const titleMatch = normalizedNaviTitle === normalizedCleanedNcmTitle;
            if (!titleMatch) continue;
            const artistMatch = normalizedNaviArtist === normalizedNcmArtist;
            const durationMatch = typeof naviTrack.duration === 'number' && typeof ncmTrack.duration === 'number'
                ? Math.abs(naviTrack.duration - ncmTrack.duration) <= DURATION_TOLERANCE_SECONDS
                : true;
            if (artistMatch) {
                if (durationMatch) {
                    tier1Match = naviTrack;
                    break;
                } else if (!tier1Match) {
                    tier1Match = naviTrack;
                }
            } else if (durationMatch && !tier1Match) {
                 if (!tier2Match) {
                     tier2Match = naviTrack;
                 }
            }
        }
        const bestMatch = tier1Match || tier2Match;
        if (bestMatch) {
            return {
                id: bestMatch.id,
                title: bestMatch.title,
                artist: bestMatch.artist,
                album: bestMatch.album,
                artwork: ncmTrack.artwork,
                duration: bestMatch.duration,
                suffix: bestMatch.suffix,
                _source: 'navidrome_ncm_artwork'
            };
        } else {
            return null;
        }
    } catch (e) {
         console.error(`Error finding NCM track ${ncmTrack.title}: ${e}`);
         return null;
    }
}


async function processNcmPlaylistImport(id) {
    const ncmDetails = await getNcmPlaylistDetails(id);
    if (!ncmDetails || ncmDetails.trackIds.length === 0) return { playlistName: `网易云歌单 ${id}`, matchedTracks: [] };
    const { trackIds, name: ncmPlaylistName } = ncmDetails;
    let ncmTracks = [];
    const batchSizeNcm = 200;
    for (let i = 0; i < trackIds.length; i += batchSizeNcm) {
        const batchIds = trackIds.slice(i, i + batchSizeNcm);
        const batchResult = await getNcmTrackDetails(batchIds);
        ncmTracks = ncmTracks.concat(batchResult);
    }
    const matchedNavidromeTracks = [];
    const searchPromises = [];
    for (const ncmTrack of ncmTracks) {
        if (!ncmTrack || !ncmTrack.title || !ncmTrack.artist) continue;
        const searchPromise = findAndMergeNcmTrackOnNavidrome(ncmTrack).catch(()=>null);
        searchPromises.push(searchPromise);
        if (searchPromises.length >= NCM_IMPORT_CONCURRENCY) {
            const results = await Promise.all(searchPromises);
            results.forEach(track => { if (track) matchedNavidromeTracks.push(track); });
            searchPromises.length = 0;
        }
    }
    if (searchPromises.length > 0) {
        const results = await Promise.all(searchPromises);
        results.forEach(track => { if (track) matchedNavidromeTracks.push(track); });
    }
    return { playlistName: ncmPlaylistName, matchedTracks: matchedNavidromeTracks };
}

async function createNavidromePlaylistApi(name) {
    try {
        const responseData = await httpGet('createPlaylist', { name: name });
        if (responseData?.['subsonic-response']?.playlist) return responseData['subsonic-response'].playlist.id;
        else if (responseData?.['subsonic-response']?.status === 'ok') {
            const playlistsData = await httpGet('getPlaylists', {});
            const playlists = playlistsData?.['subsonic-response']?.playlists?.playlist ?? [];
            const createdPlaylist = playlists.find(p => p.name === name);
            if (createdPlaylist) return createdPlaylist.id;
            else return null;
        } else throw new Error("创建歌单 API 未返回有效信息。");
    } catch (error) {
         console.error(`创建 Navidrome 播放列表 "${name}" 失败: ${error}`);
         return null;
    }
}

async function addSongsToNavidromePlaylistApi(playlistId, songIds) {
    if (!playlistId || !songIds || songIds.length === 0) return false;
    try {
        await httpGet('updatePlaylist', { playlistId: playlistId, songIdToAdd: songIds });
        return true;
    } catch (error) {
        console.error(`向 Navidrome 播放列表 ${playlistId} 添加歌曲失败: ${error}`);
        return false;
    }
}

module.exports = {
    platform: "navidrome",
    version: "2.7.2",
    author: 'Ckryin',
    srcUrl: "https://gitee.com/Rrance/WP/raw/master/navidrome.js",
    cacheControl: "no-cache",
    userVariables: [
        { key: "url", name: "服务器地址 (URL)" },
        { key: "username", name: "用户名" },
        { key: "password", name: "密码" },
        { key: "uploadPlaylist", name: "上传歌单 (yes/no)", defaultValue: "no" }
    ],
    supportedSearchType: ["music", "album", "sheet", "artist"],
    hints: {
        importMusicSheet: [
            "请输入 QQ 音乐或网易云歌单分享链接或纯数字ID。",
            "请在插件设置中配置是否上传歌单到服务器。",
            "导入速度取决于歌单大小和服务器响应，可能需几分钟。",
            "只有成功匹配的歌曲才会被导入。"
        ],
        importMusicItem: []
    },
    async search(query, page, type) {
        const userVariables = env?.getUserVariables() ?? {};
        try {
            if (type === "music") return await searchMusic(query, page);
            if (type === "album") return await searchAlbum(query, page);
            if (type === "sheet") return await searchSheet(query, page, userVariables.username);
            if (type === "artist") return await searchArtist(query, page);
            return { isEnd: true, data: [] };
        } catch (e) { return { isEnd: true, data: [] }; }
    },
    async getAlbumInfo(albumItem, page) {
        try { return await getAlbumInfoApi(albumItem, page); }
        catch (e) { return { isEnd: true, musicList: [] }; }
    },
    async getMusicSheetInfo(sheetItem, page) {
        try { return await getMusicSheetInfoApi(sheetItem, page); }
        catch (e) { return { isEnd: true, musicList: [] }; }
    },
    async getArtistWorks(artistItem, page, type) {
        try {
            if (type === 'music') {
                const start = (page - 1) * pageSize;
                const end = start + pageSize;
                const response = await httpGetNative('song', { artist_id: artistItem.id, _start: start, _end: end });
                const songs = response.data ?? [];
                const total = parseInt(response.headers['x-total-count'] || '0', 10);
                const isEnd = (start + songs.length) >= total;
                return { isEnd: isEnd, data: songs.map(formatMusicItem) };
            }
            if (type === 'album') {
                if (page > 1) return { isEnd: true, data: [] };
                const data = await httpGet('getArtist', { id: artistItem.id });
                const albums = data?.['subsonic-response']?.artist?.album ?? [];
                return { isEnd: true, data: albums.map(formatAlbumItem) };
            }
            return { isEnd: true, data: [] };
        } catch (e) { return { isEnd: true, data: [] }; }
    },
    async getMediaSource(musicItem, quality) {
        try { return await getMediaSourceApi(musicItem, quality); }
        catch (e) { return null; }
    },
    async getLyric(musicItem) {
        try { return await getLyricApi(musicItem); }
        catch (e) { return null; }
    },
    async getRecommendSheetsByTag(tag, page) {
        const userVariables = env?.getUserVariables() ?? {};
        try { return await getRecommendSheetsByTagApi(tag, page, userVariables.username); }
        catch (e) { return { isEnd: true, data: [] }; }
    },
    async getMusicInfo(musicItem) {
        try { return await getMusicInfoApi(musicItem); }
        catch (e) { return null; }
    },
    async importMusicSheet(urlLike) {
        const userVars = getUserVariables();
        const shouldUpload = userVars.uploadPlaylist === 'yes';
        const nativeToken = await getNativeToken();
        if (nativeToken) {
            sendKeepalive(nativeToken).catch(() => {});
        }
        const qqRegexList = [
            /https?:\/\/i\.y\.qq\.com\/n2\/m\/share\/details\/taoge\.html\?.*id=([0-9]+)/,
            /https?:\/\/y\.qq\.com\/n\/ryqq\/playlist\/([0-9]+)/,
            /^(\d+)$/
        ];
        for (const regex of qqRegexList) {
            const matchResult = urlLike.match(regex);
            if (matchResult && matchResult[1]) {
                try {
                    const { playlistName: qqPlaylistName, matchedTracks } = await processQQPlaylistImport(matchResult[1]);
                    if (shouldUpload && matchedTracks.length > 0 && qqPlaylistName) {
                        let existingPlaylistId = null;
                        try {
                            const playlistsData = await httpGet('getPlaylists', {});
                            const playlists = playlistsData?.['subsonic-response']?.playlists?.playlist ?? [];
                            const existingPlaylist = playlists.find(p => p.name === qqPlaylistName);
                            if (existingPlaylist) existingPlaylistId = existingPlaylist.id;
                        } catch (e) { }
                        if (existingPlaylistId) {
                            try { await httpGet('deletePlaylist', { id: existingPlaylistId }); } catch (e) { }
                        }
                        const newNavidromePlaylistId = await createNavidromePlaylistApi(qqPlaylistName);
                        if (newNavidromePlaylistId) {
                            const navidromeSongIdsToAdd = deduplicateTracks(matchedTracks).map(track => track.id);
                            await addSongsToNavidromePlaylistApi(newNavidromePlaylistId, navidromeSongIdsToAdd);
                        } else {
                             console.warn(`未能创建 Navidrome 播放列表 "${qqPlaylistName}"，歌曲未添加。`);
                        }
                    }
                    const localPlaylistTracks = deduplicateTracks(matchedTracks);
                    return localPlaylistTracks;
                } catch (e) {
                    if (regex.toString().includes('^(\\d+)$')) {
                    } else {
                        throw new Error(`导入 QQ 歌单失败: ${e.message}`);
                    }
                }
            }
        }
        const ncmPlaylistRegex = /(?:https:\/\/y\.music\.163\.com\/m\/playlist\?id=([0-9]+))|(?:https?:\/\/music\.163\.com\/playlist\/([0-9]+)\/.*)|(?:https?:\/\/music.163\.com(?:\/m)?\/(?:#\/)?playlist\?.*?id=(\d+)(?:&|$))|(?:^\s*(\d+)\s*$)/;
        const ncmMatchResult = urlLike.match(ncmPlaylistRegex);
        if (ncmMatchResult) {
            const id = ncmMatchResult[1] || ncmMatchResult[2] || ncmMatchResult[3] || ncmMatchResult[4];
            if (!id) throw new Error("无法从输入中提取有效的网易云歌单 ID。");
            try {
                const { playlistName: ncmPlaylistName, matchedTracks } = await processNcmPlaylistImport(id);
                if (shouldUpload && matchedTracks.length > 0 && ncmPlaylistName) {
                    let existingPlaylistId = null;
                    try {
                        const playlistsData = await httpGet('getPlaylists', {});
                        const playlists = playlistsData?.['subsonic-response']?.playlists?.playlist ?? [];
                        const existingPlaylist = playlists.find(p => p.name === ncmPlaylistName);
                        if (existingPlaylist) existingPlaylistId = existingPlaylist.id;
                    } catch (e) { }
                    if (existingPlaylistId) {
                        try { await httpGet('deletePlaylist', { id: existingPlaylistId }); } catch (e) { }
                    }
                    const newNavidromePlaylistId = await createNavidromePlaylistApi(ncmPlaylistName);
                    if (newNavidromePlaylistId) {
                        const navidromeSongIdsToAdd = deduplicateTracks(matchedTracks).map(track => track.id);
                        await addSongsToNavidromePlaylistApi(newNavidromePlaylistId, navidromeSongIdsToAdd);
                    } else {
                         console.warn(`未能创建 Navidrome 播放列表 "${ncmPlaylistName}"，歌曲未添加。`);
                    }
                }
                const localPlaylistTracks = deduplicateTracks(matchedTracks);
                return localPlaylistTracks;
            } catch (e) { throw new Error(`导入网易云歌单失败: ${e.message}`); }
        }
        throw new Error("无法识别的 QQ 音乐或网易云歌单链接或 ID 格式。");
    },
    async getTopLists() {
        try { return await getTopListsApi(); }
        catch (e) { return []; }
    },
    async getTopListDetail(topListItem, page) {
        try { return await getTopListDetailApi(topListItem, page); }
        catch (e) { return { isEnd: true, musicList: [] }; }
    }
};

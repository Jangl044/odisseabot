import fetch from 'node-fetch'
import { createCanvas, loadImage } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yts from 'yt-search'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const USERS_FILE = path.join(__dirname, '..', 'lastfm_users.json')
const LIKES_FILE = path.join(__dirname, '..', 'song_likes.json')

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}', 'utf8')
if (!fs.existsSync(LIKES_FILE)) fs.writeFileSync(LIKES_FILE, '{}', 'utf8')

const cache = new Map()
const CACHE_DURATION = 300000

function loadUsers() { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) }
function saveUsers(users) { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8') }

function loadLikes() { return JSON.parse(fs.readFileSync(LIKES_FILE, 'utf8')) }
function saveLikes(likes) { fs.writeFileSync(LIKES_FILE, JSON.stringify(likes, null, 2), 'utf8') }

function getLastfmUsername(userId) { return loadUsers()[userId] || null }
function setLastfmUsername(userId, username) { const users = loadUsers(); users[userId] = username; saveUsers(users) }

function getSongLikes(songId) { const likes = loadLikes(); return likes[songId] || 0 }
function addSongLike(songId) { const likes = loadLikes(); likes[songId] = (likes[songId] || 0) + 1; saveLikes(likes) }
function getUserLikes(userId) { const likes = loadLikes(); return Object.values(likes).reduce((a, b) => a + b, 0) }

const LASTFM_API_KEY = '36f859a1fc4121e7f0e931806507d5f9'

async function fetchWithCache(url) {
  const now = Date.now()
  const cached = cache.get(url)
  if (cached && now - cached.timestamp < CACHE_DURATION) return cached.data
  const res = await fetch(url)
  const json = await res.json()
  cache.set(url, { data: json, timestamp: now })
  return json
}

async function getUserInfo(username) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${LASTFM_API_KEY}&format=json`
  return (await fetchWithCache(url))?.user
}

async function getTrackInfo(username, artist, track) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&username=${username}&format=json`
  return (await fetchWithCache(url))?.track
}

async function getRecentTrack(username) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=1`
  return (await fetchWithCache(url))?.recenttracks?.track?.[0]
}

async function getRecentTracks(username, limit = 10) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`
  return (await fetchWithCache(url))?.recenttracks?.track || []
}

async function getTopArtists(username, period = '7day', limit = 9) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&api_key=${LASTFM_API_KEY}&format=json&period=${period}&limit=${limit}`
  return (await fetchWithCache(url))?.topartists?.artist
}

async function getTopAlbums(username, period = '7day', limit = 9) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${LASTFM_API_KEY}&format=json&period=${period}&limit=${limit}`
  return (await fetchWithCache(url))?.topalbums?.album
}

async function getTopTracks(username, period = '7day', limit = 9) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&period=${period}&limit=${limit}`
  return (await fetchWithCache(url))?.toptracks?.track
}

async function searchYoutube(query) {
  const search = await yts(query)
  if (!search.all.length) return null
  return search.all[0]
}

const handler = async (m, { conn, args, usedPrefix, text, command }) => {
  if (command === 'setuser') {
    const username = text.trim()
    if (!username) return conn.sendMessage(m.chat, { text: `❌ Usa: ${usedPrefix}setuser <username>` })
    setLastfmUsername(m.sender, username)
    return conn.sendMessage(m.chat, { text: `✅ Username *${username}* salvato!` })
  }

  if (command === 'like') {
    const user = getLastfmUsername(m.sender)
    if (!user) return conn.sendMessage(m.chat, { text: `❌ Prima registrati con ${usedPrefix}setuser` })
    
    const track = await getRecentTrack(user)
    if (!track) return conn.sendMessage(m.chat, { text: '❌ Nessuna traccia trovata.' })
    
    const songId = `${track.artist?.['#text'] || 'unknown'}_${track.name || 'unknown'}`
    addSongLike(songId)
    const totalLikes = getSongLikes(songId)
    const userLikes = getUserLikes(m.sender)
    
    return conn.sendMessage(m.chat, { 
      text: `🔥 +1 like per "${track.name}"\n🎯 Likes totali: ${totalLikes}\n📊 Tuoi likes totali: ${userLikes}` 
    })
  }

  const user = getLastfmUsername(m.sender)
  if (!user) return conn.sendMessage(m.chat, { text: `❌ Registrati con ${usedPrefix}setuser <username>` })

  if (command === 'cur') {
    const track = await getRecentTrack(user)
    if (!track) return conn.sendMessage(m.chat, { text: '❌ Nessuna traccia trovata.' })

    const nowPlaying = track['@attr']?.nowplaying === 'true'
    const artist = track.artist?.['#text'] || 'Artista sconosciuto'
    const title = track.name || 'Brano sconosciuto'
    const album = track.album?.['#text'] || 'Album sconosciuto'
    const image = track.image?.find(img => img.size === 'extralarge')?.['#text'] || null
    
    const info = await getTrackInfo(user, artist, title)
    const userInfo = await getUserInfo(user)
    const songId = `${artist}_${title}`
    const likes = getSongLikes(songId)

    const caption = `
🎧 *${nowPlaying ? 'In riproduzione' : 'Ultimo brano'}* di ${user}

🎵 ${title}
🎤 ${artist}
💿 ${album}

▶️ Ascolti Personali: ${info?.userplaycount || 0}
🌍 Ascolti Globali: ${info?.playcount || 0}
📊 Ascolti Totali: ${userInfo?.playcount || 0}
🔥 Likes: ${likes}
    `.trim()

    const buttons = [
      { buttonId: `${usedPrefix}like`, buttonText: { displayText: '🔥 Like' }, type: 1 },
      { buttonId: `${usedPrefix}topartists`, buttonText: { displayText: '🎤 Artisti' }, type: 1 },
      { buttonId: `${usedPrefix}topalbums`, buttonText: { displayText: '💿 Album' }, type: 1 },
      { buttonId: `${usedPrefix}toptracks`, buttonText: { displayText: '🎵 Tracce' }, type: 1 },
      { buttonId: `${usedPrefix}cronologia`, buttonText: { displayText: '📜 Cronologia' }, type: 1 }
    ]

    if (image) {
      await conn.sendMessage(m.chat, {
        image: { url: image },
        caption: caption,
        footer: `Last.fm • ${user}`,
        buttons: buttons,
        headerType: 4
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        text: caption,
        footer: `Last.fm • ${user}`,
        buttons: buttons,
        headerType: 1
      }, { quoted: m })
    }
    return
  }

  if (command === 'topartists') {
    const period = text.toLowerCase().match(/(7day|1month|3month|6month|12month|overall)/)?.[0] || '7day'
    const artists = await getTopArtists(user, period, 9)
    if (!artists || artists.length === 0) return conn.sendMessage(m.chat, { text: '❌ Nessun dato trovato.' })

    const list = artists.map((a, i) => `${i+1}. ${a.name} - ${a.playcount} scrobble`).join('\n')
    
    const buttons = [
      { buttonId: `${usedPrefix}topartists 7day`, buttonText: { displayText: '📅 7 giorni' }, type: 1 },
      { buttonId: `${usedPrefix}topartists 1month`, buttonText: { displayText: '📅 1 mese' }, type: 1 },
      { buttonId: `${usedPrefix}topartists 6month`, buttonText: { displayText: '📅 6 mesi' }, type: 1 },
      { buttonId: `${usedPrefix}topartists overall`, buttonText: { displayText: '📊 Overall' }, type: 1 }
    ]

    await conn.sendMessage(m.chat, { 
      text: `🎤 Top artisti di ${user} (${period}):\n\n${list}`, 
      buttons: buttons,
      headerType: 1 
    }, { quoted: m })
    return
  }

  if (command === 'topalbums') {
    const period = text.toLowerCase().match(/(7day|1month|3month|6month|12month|overall)/)?.[0] || '7day'
    const albums = await getTopAlbums(user, period, 9)
    if (!albums || albums.length === 0) return conn.sendMessage(m.chat, { text: '❌ Nessun dato trovato.' })

    const list = albums.map((a, i) => `${i+1}. ${a.name} - ${a.artist?.name || 'Unknown'} (${a.playcount} play)`).join('\n')
    
    const buttons = [
      { buttonId: `${usedPrefix}topalbums 7day`, buttonText: { displayText: '📅 7 giorni' }, type: 1 },
      { buttonId: `${usedPrefix}topalbums 1month`, buttonText: { displayText: '📅 1 mese' }, type: 1 },
      { buttonId: `${usedPrefix}topalbums 6month`, buttonText: { displayText: '📅 6 mesi' }, type: 1 },
      { buttonId: `${usedPrefix}topalbums overall`, buttonText: { displayText: '📊 Overall' }, type: 1 }
    ]

    await conn.sendMessage(m.chat, { 
      text: `💿 Top album di ${user} (${period}):\n\n${list}`, 
      buttons: buttons,
      headerType: 1 
    }, { quoted: m })
    return
  }

  if (command === 'toptracks') {
    const period = text.toLowerCase().match(/(7day|1month|3month|6month|12month|overall)/)?.[0] || '7day'
    const tracks = await getTopTracks(user, period, 9)
    if (!tracks || tracks.length === 0) return conn.sendMessage(m.chat, { text: '❌ Nessun dato trovato.' })

    const list = tracks.map((t, i) => `${i+1}. ${t.name} - ${t.artist?.name || 'Unknown'} (${t.playcount} play)`).join('\n')
    
    const buttons = [
      { buttonId: `${usedPrefix}toptracks 7day`, buttonText: { displayText: '📅 7 giorni' }, type: 1 },
      { buttonId: `${usedPrefix}toptracks 1month`, buttonText: { displayText: '📅 1 mese' }, type: 1 },
      { buttonId: `${usedPrefix}toptracks 6month`, buttonText: { displayText: '📅 6 mesi' }, type: 1 },
      { buttonId: `${usedPrefix}toptracks overall`, buttonText: { displayText: '📊 Overall' }, type: 1 }
    ]

    await conn.sendMessage(m.chat, { 
      text: `🎵 Top tracce di ${user} (${period}):\n\n${list}`, 
      buttons: buttons,
      headerType: 1 
    }, { quoted: m })
    return
  }

  if (command === 'cronologia') {
    const tracks = await getRecentTracks(user, 10)
    if (!tracks.length) return conn.sendMessage(m.chat, { text: '❌ Nessuna cronologia trovata.' })

    const trackList = tracks.map((track, i) => {
      const icon = track['@attr']?.nowplaying === 'true' ? '▶️' : `${i + 1}.`
      return `${icon} ${track.name}\n   🖌️ ${track.artist['#text']}`
    }).join('\n\n')

    const cron = `📜 Cronologia di ${user}\n\n${trackList}`
    
    const buttons = [
      { buttonId: `${usedPrefix}cur`, buttonText: { displayText: '🎧 Ora in riproduzione' }, type: 1 },
      { buttonId: `${usedPrefix}topartists`, buttonText: { displayText: '🎤 Top Artisti' }, type: 1 },
      { buttonId: `${usedPrefix}topalbums`, buttonText: { displayText: '💿 Top Album' }, type: 1 },
      { buttonId: `${usedPrefix}toptracks`, buttonText: { displayText: '🎵 Top Tracce' }, type: 1 }
    ]

    await conn.sendMessage(m.chat, {
      text: cron,
      footer: 'Ultime 10 tracce ascoltate',
      buttons: buttons,
      headerType: 1
    })
    return
  }
}

handler.command = ['setuser', 'cur', 'like', 'topartists', 'topalbums', 'toptracks', 'cronologia']
handler.group = true
handler.tags = ['lastfm']

export default handler

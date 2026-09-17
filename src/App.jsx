import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { books, getRoomItem } from './data/roomContent'

const RoomCanvas = lazy(() => import('./components/RoomCanvas'))
const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`

const BOOK_NOTES_STORAGE_KEY = 'my-room.book-notes.v1'
const EDIT_MODE_STORAGE_KEY = 'my-room.edit-mode.v1'
const BOOK_NOTE_FIELDS = ['insight', 'excerpt']
const MEDIA_DATABASE_NAME = 'my-room-media.v1'
const PHOTO_STORE_NAME = 'photos'
const TRACK_STORE_NAME = 'tracks'
const SPORT_PHOTO_STORE_NAME = 'sportPhotos'
const BOOK_EXCERPT_MEDIA_STORE_NAME = 'bookExcerptMedia'
const MUSIC_SEED_STORAGE_KEY = 'my-room.music-seeded.v7-streaming'
const REMOVED_STARTER_TRACK_IDS = new Set([
  'starter-auld-lang-syne',
  'starter-singin-in-the-rain',
  'starter-greensleeves',
])
const CODE_PROJECTS_STORAGE_KEY = 'my-room.code-projects.v1'
const WHITEBOARD_STORAGE_KEY = 'my-room.whiteboard.v1'
const SPORT_STORAGE_KEY = 'my-room.sports.v1'
const SOUND_STORAGE_KEY = 'my-room.interface-sound.v1'
const INTRO_STORAGE_KEY = 'my-room.intro-seen.v2.1-final'
const MINI_PLAYER_LYRICS_STORAGE_KEY = 'my-room.mini-player-lyrics-collapsed.v1'
const VISITOR_COPY_STORAGE_KEY = 'my-room.visitor-copy-created.v1'
const STARTER_TRACKS = [
  {
    id: 'personal-tian-liang-yi-qian-shuo-zai-jian',
    title: '天亮以前说再见',
    artist: '曲肖冰',
    album: '天亮以前说再见',
    note: '2019 年发行的国语流行单曲，词曲围绕告别、留住纪念和重新走向明天展开。作曲：康梓峰；发行：千和世纪。你可以继续写下它为什么会留在自己的房间里。',
    path: publicAsset('assets/music/tian-liang-yi-qian-shuo-zai-jian.mp3'),
    lyricsPath: publicAsset('assets/music/lyrics/tian-liang-yi-qian-shuo-zai-jian.lrc'),
  },
  {
    id: 'personal-beautiful-day',
    title: "It's a Beautiful Day",
    artist: 'Evan McHugh',
    album: "It's a Beautiful Day - Single",
    note: 'Evan McHugh 的明亮流行作品，2013 年由 Position Music 发行。3:35 的轻快节奏适合放在房间漫游和整理照片时播放。',
    path: publicAsset('assets/music/beautiful-day.mp3'),
    lyricsPath: publicAsset('assets/music/lyrics/beautiful-day.lrc'),
  },
  {
    id: 'personal-christmas-list',
    title: 'Christmas List',
    artist: 'Anson Seabra',
    album: 'Christmas List - Single',
    note: 'Anson Seabra 于 2022 年 11 月 30 日发行的流行单曲。克制的冬日氛围很适合房间唱片机安静播放；你可以继续补充这首歌与你自己的记忆。',
    path: publicAsset('assets/music/christmas-list.mp3'),
    lyricsPath: publicAsset('assets/music/lyrics/christmas-list.lrc'),
  },
  {
    id: 'personal-tong-hua',
    title: '童话',
    artist: '光良',
    album: '童话',
    note: '光良作词、作曲并演唱的代表作，收录于 2005 年发行的同名专辑。钢琴与逐渐展开的编曲，让它像一段从安静回忆走向坚定愿望的故事。',
    path: publicAsset('assets/music/tong-hua.mp3'),
    lyricsPath: publicAsset('assets/music/lyrics/tong-hua.lrc'),
  },
  {
    id: 'personal-lumiere',
    title: 'Lumière',
    artist: 'A Thousand Years',
    album: '我的收藏',
    note: '“Lumière”意为光。它可以成为房间里更安静、朦胧的一段，让音乐区在明亮与沉静之间拥有呼吸感。',
    path: publicAsset('assets/music/lumiere.mp3'),
    lyricsPath: publicAsset('assets/music/lyrics/lumiere.lrc'),
  },
  {
    id: 'personal-mystery-of-love',
    title: 'Mystery of Love',
    artist: 'Sufjan Stevens',
    album: 'Call Me by Your Name',
    note: 'Sufjan Stevens 为电影《请以你的名字呼唤我》创作并演唱的作品。轻盈的拨弦和克制的人声，很适合与旅行照片、夏日记忆一起出现。',
    path: publicAsset('assets/music/mystery-of-love.mp3'),
    lyricsPath: publicAsset('assets/music/lyrics/mystery-of-love.lrc'),
  },
  {
    id: 'personal-a-thousand-years',
    title: 'A Thousand Years',
    artist: 'Christina Perri',
    album: 'The Twilight Saga: Breaking Dawn – Part 1',
    note: 'Christina Perri 与 David Hodges 创作的抒情作品，收录于《暮光之城：破晓（上）》电影原声。钢琴与弦乐带来缓慢累积、最终舒展的情绪。',
    path: publicAsset('assets/music/a-thousand-years.mp3'),
    lyricsPath: publicAsset('assets/music/lyrics/a-thousand-years.lrc'),
  },
]

const DEFAULT_CODE_PROJECTS = [
  {
    id: 'my-personal-room',
    title: 'My Personal 3D Room',
    kicker: 'PERSONAL WEB EXPERIENCE',
    description: '把游戏、阅读、音乐、摄影和运动放进一个可以自由探索的 3D 房间。每件物品既是空间的一部分，也是进入一段个人内容的入口。',
    stack: 'React · Three.js · React Three Fiber · Vite',
    language: 'JSX',
    note: '这是这个房间正在生长的源头。以后可以在这里放项目故事、关键代码，以及我为什么想做它。',
    code: `function PersonalRoom() {
  const [selectedItem, setSelectedItem] = useState(null)

  return (
    <RoomCanvas
      onSelect={setSelectedItem}
      cameraFocus={selectedItem?.focus}
    >
      <Bookshelf books={myReadingList} />
      <RecordPlayer playlist={mySoundtrack} />
      <PhotoWall memories={myJourneys} />
      <GameTheatre moments={thingsThatMoveMe} />
    </RoomCanvas>
  )
}`,
  },
]

const DEFAULT_WHITEBOARD_CONTENT = {
  title: '欢迎来到我的房间',
  lead: '这里放着一些曾经震撼我、塑造我，也一直陪伴我的东西。',
  story: '游戏让我看见想象力可以抵达的高度，书籍帮我整理混乱的思考，音乐、摄影与旅行保存那些无法复刻的瞬间。这个房间不是履历，它更像一张仍在生长的精神地图。',
  motto: '保持好奇，认真生活，去创造真正打动自己的东西。',
  keywords: '游戏 · 阅读 · 音乐 · 摄影 · 旅行 · 运动 · 创造',
  signature: 'THINGS THAT MOVE ME',
  logo: publicAsset('assets/whiteboard/fusu-logo.webp'),
}

const DEFAULT_SPORT_CONTENT = {
  running: {
    title: '在脚步里重新整理自己',
    lead: '跑步是一段只需要面对呼吸、节奏和自己的时间。',
    frequency: '等待填写',
    milestone: '等待填写',
    target: '等待填写',
    meaning: '我喜欢跑步带来的直接感：每一步都很普通，但持续下去以后，身体和想法都会慢慢发生变化。',
    memory: '可以在这里写下一次难忘的夜跑、第一次完成的距离，或者某段坚持下来的时期。',
    quote: '先迈出下一步。',
  },
  badminton: {
    title: '速度、判断与来回之间',
    lead: '羽毛球让我享受即时反应，也享受和对手共同创造一个回合。',
    frequency: '等待填写',
    milestone: '等待填写',
    target: '等待填写',
    meaning: '它既有速度和爆发，也需要耐心、落点与判断。每一个漂亮的回合，都来自双方不断回应。',
    memory: '可以在这里记录常去的球馆、喜欢的打法、一起打球的人，或者一个至今记得的回合。',
    quote: '保持移动，等待下一拍。',
  },
}

let starterTrackSeedPromise

function openMediaDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(MEDIA_DATABASE_NAME, 5)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        request.result.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'id' })
      }
      if (!request.result.objectStoreNames.contains(TRACK_STORE_NAME)) {
        request.result.createObjectStore(TRACK_STORE_NAME, { keyPath: 'id' })
      }
      if (!request.result.objectStoreNames.contains(SPORT_PHOTO_STORE_NAME)) {
        request.result.createObjectStore(SPORT_PHOTO_STORE_NAME, { keyPath: 'id' })
      }
      if (!request.result.objectStoreNames.contains(BOOK_EXCERPT_MEDIA_STORE_NAME)) {
        request.result.createObjectStore(BOOK_EXCERPT_MEDIA_STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('媒体数据库正在被旧页面占用，请刷新页面后重试'))
  })
}

async function mediaStoreRequest(storeName, mode, action) {
  const database = await openMediaDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = action(transaction.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error)
  })
}

const readPhotos = () => mediaStoreRequest(PHOTO_STORE_NAME, 'readonly', (store) => store.getAll())
const writePhoto = (photo) => mediaStoreRequest(PHOTO_STORE_NAME, 'readwrite', (store) => store.put(photo))
const removePhoto = (photoId) => mediaStoreRequest(PHOTO_STORE_NAME, 'readwrite', (store) => store.delete(photoId))
const storedPhoto = ({ objectUrl, thumbnailUrl, ...photo }) => photo
const readTracks = () => mediaStoreRequest(TRACK_STORE_NAME, 'readonly', (store) => store.getAll())
const writeTrack = (track) => mediaStoreRequest(TRACK_STORE_NAME, 'readwrite', (store) => store.put(track))
const removeTrack = (trackId) => mediaStoreRequest(TRACK_STORE_NAME, 'readwrite', (store) => store.delete(trackId))
const storedTrack = ({ audioUrl, coverUrl, ...track }) => track
const readSportPhotos = () => mediaStoreRequest(SPORT_PHOTO_STORE_NAME, 'readonly', (store) => store.getAll())
const writeSportPhoto = (photo) => mediaStoreRequest(SPORT_PHOTO_STORE_NAME, 'readwrite', (store) => store.put(photo))
const removeSportPhoto = (photoId) => mediaStoreRequest(SPORT_PHOTO_STORE_NAME, 'readwrite', (store) => store.delete(photoId))
const storedSportPhoto = ({ objectUrl, thumbnailUrl, ...photo }) => photo
const readBookExcerptMedia = () => mediaStoreRequest(BOOK_EXCERPT_MEDIA_STORE_NAME, 'readonly', (store) => store.getAll())
const writeBookExcerptMedia = (media) => mediaStoreRequest(BOOK_EXCERPT_MEDIA_STORE_NAME, 'readwrite', (store) => store.put(media))
const removeBookExcerptMedia = (mediaId) => mediaStoreRequest(BOOK_EXCERPT_MEDIA_STORE_NAME, 'readwrite', (store) => store.delete(mediaId))

const getMediaType = (media) => media.mediaType || (media.blob?.type?.startsWith('video/') ? 'video' : 'image')

function hydrateMediaRecord(record, urlSet) {
  const objectUrl = window.URL.createObjectURL(record.blob)
  urlSet.add(objectUrl)
  let thumbnailUrl = ''
  if (record.thumbnailBlob) {
    thumbnailUrl = window.URL.createObjectURL(record.thumbnailBlob)
    urlSet.add(thumbnailUrl)
  }
  return { ...record, mediaType: getMediaType(record), objectUrl, thumbnailUrl }
}

function revokeMediaRecord(record, urlSet) {
  ;[record?.objectUrl, record?.thumbnailUrl].filter(Boolean).forEach((url) => {
    window.URL.revokeObjectURL(url)
    urlSet.delete(url)
  })
}

function createVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const objectUrl = window.URL.createObjectURL(file)
    let settled = false
    let timer
    const finish = (blob = null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      video.removeAttribute('src')
      video.load()
      window.URL.revokeObjectURL(objectUrl)
      resolve(blob)
    }
    const capture = () => {
      if (!video.videoWidth || !video.videoHeight) return finish()
      const scale = Math.min(1, 640 / video.videoWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => finish(blob), 'image/webp', 0.78)
    }
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const target = duration > 0.2 ? Math.min(1, duration * 0.08) : 0
      if (target > 0) video.currentTime = target
      else capture()
    }
    video.onseeked = capture
    video.onerror = () => finish()
    timer = window.setTimeout(() => finish(), 8000)
    video.src = objectUrl
    video.load()
  })
}

function createImageThumbnail(file) {
  return new Promise((resolve) => {
    const image = new Image()
    const objectUrl = window.URL.createObjectURL(file)
    image.onload = () => {
      const scale = Math.min(1, 640 / image.naturalWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        window.URL.revokeObjectURL(objectUrl)
        resolve(blob)
      }, 'image/webp', 0.78)
    }
    image.onerror = () => {
      window.URL.revokeObjectURL(objectUrl)
      resolve(null)
    }
    image.src = objectUrl
  })
}

function MediaStage({ media, className = '' }) {
  if (media.mediaType === 'video') {
    return <video className={className} src={media.objectUrl} poster={media.thumbnailUrl || undefined} controls playsInline preload="metadata" />
  }
  return <img className={className} src={media.objectUrl} alt={media.title || '相册照片'} decoding="async" />
}

function MediaThumbnail({ media }) {
  const previewUrl = media.thumbnailUrl || (media.mediaType === 'image' ? media.objectUrl : '')
  return (
    <>
      {previewUrl ? <img src={previewUrl} alt="" loading="lazy" decoding="async" /> : <span className="media-video-fallback">▶</span>}
      {media.mediaType === 'video' && <i className="media-video-badge">▶</i>}
    </>
  )
}

function getMediaBackdropStyle(media) {
  const previewUrl = media.thumbnailUrl || (media.mediaType === 'image' ? media.objectUrl : '')
  return previewUrl ? { '--media-backdrop': `url("${previewUrl}")` } : undefined
}

async function seedStarterTracks() {
  try {
    if (window.localStorage.getItem(MUSIC_SEED_STORAGE_KEY) === 'true') return
  } catch {
    // IndexedDB can still provide the starter playlist when local storage is unavailable.
  }
  if (!starterTrackSeedPromise) {
    starterTrackSeedPromise = (async () => {
      const existing = await readTracks()
      const removed = existing.filter((track) => REMOVED_STARTER_TRACK_IDS.has(track.id))
      await Promise.all(removed.map((track) => removeTrack(track.id)))
      const existingById = new Map(existing.filter((track) => !REMOVED_STARTER_TRACK_IDS.has(track.id)).map((track) => [track.id, track]))
      await Promise.all(STARTER_TRACKS.map(async ({ path, lyricsPath, ...track }, index) => {
        const savedTrack = existingById.get(track.id)
        const lyricsResponse = await fetch(lyricsPath)
        if (!lyricsResponse.ok) throw new Error(`Unable to load starter lyrics: ${lyricsPath}`)
        const starterLyrics = await lyricsResponse.text()
        if (savedTrack) {
          const savedLyrics = typeof savedTrack.lyrics === 'string' && savedTrack.lyrics.trim() ? savedTrack.lyrics : starterLyrics
          const migratedTrack = { ...savedTrack, ...track, lyrics: savedLyrics, sourcePath: path }
          delete migratedTrack.audioBlob
          await writeTrack(migratedTrack)
          return
        }
        await writeTrack({
          ...track,
          lyrics: starterLyrics,
          createdAt: 1_780_000_000_000 + index,
          order: index,
          sourcePath: path,
          coverBlob: null,
        })
      }))
      try {
        window.localStorage.setItem(MUSIC_SEED_STORAGE_KEY, 'true')
      } catch {
        // Deterministic IDs keep repeated seeding safe in restricted browsing modes.
      }
    })().finally(() => { starterTrackSeedPromise = null })
  }
  return starterTrackSeedPromise
}

function readCodeProjects() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CODE_PROJECTS_STORAGE_KEY) || 'null')
    return Array.isArray(stored) && stored.length ? stored : DEFAULT_CODE_PROJECTS
  } catch {
    return DEFAULT_CODE_PROJECTS
  }
}

function readWhiteboardContent() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(WHITEBOARD_STORAGE_KEY) || 'null')
    return stored && typeof stored === 'object' && !Array.isArray(stored)
      ? { ...DEFAULT_WHITEBOARD_CONTENT, ...stored }
      : DEFAULT_WHITEBOARD_CONTENT
  } catch {
    return DEFAULT_WHITEBOARD_CONTENT
  }
}

function readSportContent() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SPORT_STORAGE_KEY) || 'null')
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return DEFAULT_SPORT_CONTENT
    return {
      running: { ...DEFAULT_SPORT_CONTENT.running, ...(stored.running || {}) },
      badminton: { ...DEFAULT_SPORT_CONTENT.badminton, ...(stored.badminton || {}) },
    }
  } catch {
    return DEFAULT_SPORT_CONTENT
  }
}

function readAllBookNotes() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(BOOK_NOTES_STORAGE_KEY) || '{}')
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
    return Object.fromEntries(Object.entries(stored).map(([bookId, values]) => [
      bookId,
      Object.fromEntries(BOOK_NOTE_FIELDS.map((field) => [field, typeof values?.[field] === 'string' ? values[field] : ''])),
    ]))
  } catch {
    return {}
  }
}

function readBookNote(bookId) {
  const emptyNote = { insight: '', excerpt: '' }
  try {
    const stored = readAllBookNotes()
    return { ...emptyNote, ...(stored[bookId] || {}) }
  } catch {
    return emptyNote
  }
}

function saveBookNote(bookId, note) {
  try {
    const stored = readAllBookNotes()
    const cleaned = Object.fromEntries(BOOK_NOTE_FIELDS.map((field) => [field, typeof note[field] === 'string' ? note[field] : '']))
    window.localStorage.setItem(BOOK_NOTES_STORAGE_KEY, JSON.stringify({ ...stored, [bookId]: cleaned }))
    return true
  } catch {
    return false
  }
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-mark" />
      <p>正在整理房间</p>
    </div>
  )
}

function IntroSequence({ onComplete }) {
  return (
    <motion.button
      className="intro-sequence"
      type="button"
      aria-label="跳过房间序章"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, .08] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3.35, times: [0, .5, 1], ease: [0.22, 1, 0.36, 1] }}
      onClick={onComplete}
    >
      <motion.div className="intro-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35, duration: .7 }}>THINGS THAT MOVE ME</motion.span>
      <motion.strong initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55, duration: .8 }}>欢迎来到我的房间</motion.strong>
      <motion.small initial={{ opacity: 0 }} animate={{ opacity: .52 }} transition={{ delay: 1.25, duration: .5 }}>点击任意处进入</motion.small>
    </motion.button>
  )
}

function useInterfaceSound(enabled) {
  const contextRef = useRef(null)

  useEffect(() => () => contextRef.current?.close(), [])

  return useCallback(() => {
    if (!enabled) return
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      const context = contextRef.current || new AudioContextClass()
      contextRef.current = context
      if (context.state === 'suspended') context.resume()
      const now = context.currentTime
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(390, now)
      oscillator.frequency.exponentialRampToValueAtTime(530, now + .075)
      gain.gain.setValueAtTime(.0001, now)
      gain.gain.exponentialRampToValueAtTime(.022, now + .012)
      gain.gain.exponentialRampToValueAtTime(.0001, now + .12)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + .13)
    } catch {
      // The visual interaction remains available when audio is blocked.
    }
  }, [enabled])
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00'
  const minutes = Math.floor(value / 60)
  return `${minutes}:${String(Math.floor(value % 60)).padStart(2, '0')}`
}

function isLyricCreditLine(text) {
  return /^(作词|作曲|编曲|制作人|配唱|录音工程师|录音室|录音助理|混音工程师|混音助理|混音室|混音|钢琴|低音吉他|吉他|和声|和声编写|弦乐|音频编辑|监制|主人声|母带工程师|制作人经纪|OP|SP|ISRC)\s*[:：]/i.test(text)
}

function buildLyricTimeline(source, duration) {
  const lines = String(source || '').split(/\r?\n/)
  const timed = []

  lines.forEach((line) => {
    const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)]
    const lyric = line.replace(/\[[^\]]+\]/g, '').trim()
    if (!lyric || !stamps.length || isLyricCreditLine(lyric)) return
    stamps.forEach((stamp) => {
      const milliseconds = stamp[3] ? Number(stamp[3].padEnd(3, '0').slice(0, 3)) : 0
      timed.push({
        time: Number(stamp[1]) * 60 + Number(stamp[2]) + milliseconds / 1000,
        text: lyric,
      })
    })
  })

  if (timed.length) return timed.sort((a, b) => a.time - b.time)

  const plain = lines.map((line) => line.trim()).filter(Boolean)
  if (!plain.length) return []
  const interval = Number.isFinite(duration) && duration > 0 ? duration / plain.length : 4
  return plain.map((text, index) => ({ time: index * interval, text }))
}

function useMusicLibrary() {
  const [tracks, setTracks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState({ current: 0, duration: 0 })
  const [status, setStatus] = useState('正在读取曲库…')
  const audioRef = useRef(null)
  const objectUrls = useRef(new Set())
  const currentTrack = tracks[currentIndex]

  useEffect(() => {
    let active = true
    seedStarterTracks().then(readTracks).then((records) => {
      if (!active) return
      const hydrated = records.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)).map((track) => {
        const audioUrl = track.audioBlob ? window.URL.createObjectURL(track.audioBlob) : track.sourcePath
        const coverUrl = track.coverBlob ? window.URL.createObjectURL(track.coverBlob) : ''
        if (track.audioBlob) objectUrls.current.add(audioUrl)
        if (coverUrl) objectUrls.current.add(coverUrl)
        return { ...track, audioUrl, coverUrl }
      })
      setTracks(hydrated)
      setStatus(hydrated.length ? `${hydrated.length} 首音乐已就绪` : '曲库还是空的')
    }).catch(() => active && setStatus('浏览器无法读取本地音乐'))
    return () => {
      active = false
      objectUrls.current.forEach((url) => window.URL.revokeObjectURL(url))
      objectUrls.current.clear()
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.src = currentTrack.audioUrl
    audio.load()
    setProgress({ current: 0, duration: 0 })
    if (isPlaying) audio.play().catch(() => setIsPlaying(false))
  }, [currentTrack?.id])

  const play = () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (audio.paused) audio.play().then(() => setIsPlaying(true)).catch(() => setStatus('浏览器阻止了播放'))
    else { audio.pause(); setIsPlaying(false) }
  }

  const select = (index, autoplay = false) => {
    setCurrentIndex(Math.max(0, Math.min(tracks.length - 1, index)))
    if (autoplay) setIsPlaying(true)
  }

  const next = () => {
    if (!tracks.length) return
    setCurrentIndex((value) => (value + 1) % tracks.length)
    setIsPlaying(true)
  }

  const previous = () => {
    if (!tracks.length) return
    setCurrentIndex((value) => (value - 1 + tracks.length) % tracks.length)
    setIsPlaying(true)
  }

  const add = async (files) => {
    const audioFiles = Array.from(files || []).filter((file) => file.type.startsWith('audio/'))
    if (!audioFiles.length) return
    setStatus('正在加入音乐…')
    try {
      const records = audioFiles.map((file, index) => ({
        id: window.crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ''), artist: '', album: '', note: '', lyrics: '',
        createdAt: Date.now() + index, order: tracks.length + index, audioBlob: file, coverBlob: null,
      }))
      await Promise.all(records.map(writeTrack))
      const hydrated = records.map((track) => {
        const audioUrl = window.URL.createObjectURL(track.audioBlob)
        objectUrls.current.add(audioUrl)
        return { ...track, audioUrl, coverUrl: '' }
      })
      setTracks((current) => [...current, ...hydrated])
      if (!tracks.length) setCurrentIndex(0)
      setStatus(`已加入 ${records.length} 首音乐`)
    } catch { setStatus('音乐保存失败') }
  }

  const update = (field, value) => {
    setTracks((current) => current.map((track, index) => {
      if (index !== currentIndex) return track
      const nextTrack = { ...track, [field]: value }
      writeTrack(storedTrack(nextTrack)).catch(() => setStatus('资料保存失败'))
      return nextTrack
    }))
  }

  const setCover = async (file) => {
    if (!file || !currentTrack) return
    const oldUrl = currentTrack.coverUrl
    const coverUrl = window.URL.createObjectURL(file)
    objectUrls.current.add(coverUrl)
    const nextTrack = { ...currentTrack, coverBlob: file, coverUrl }
    try {
      await writeTrack(storedTrack(nextTrack))
      setTracks((current) => current.map((track, index) => index === currentIndex ? nextTrack : track))
      if (oldUrl) { window.URL.revokeObjectURL(oldUrl); objectUrls.current.delete(oldUrl) }
      setStatus('封面已保存')
    } catch { window.URL.revokeObjectURL(coverUrl); objectUrls.current.delete(coverUrl); setStatus('封面保存失败') }
  }

  const remove = async () => {
    if (!currentTrack) return
    try {
      audioRef.current?.pause()
      await removeTrack(currentTrack.id)
      if (objectUrls.current.has(currentTrack.audioUrl)) window.URL.revokeObjectURL(currentTrack.audioUrl)
      if (objectUrls.current.has(currentTrack.coverUrl)) window.URL.revokeObjectURL(currentTrack.coverUrl)
      objectUrls.current.delete(currentTrack.audioUrl)
      objectUrls.current.delete(currentTrack.coverUrl)
      setTracks((current) => current.filter((track) => track.id !== currentTrack.id))
      setCurrentIndex((value) => Math.max(0, Math.min(value, tracks.length - 2)))
      setIsPlaying(false)
      setStatus('音乐已移除')
    } catch { setStatus('无法移除音乐') }
  }

  const seek = (value) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Number(value)
    setProgress((current) => ({ ...current, current: Number(value) }))
  }

  const audio = <audio ref={audioRef} preload="metadata" onTimeUpdate={(event) => setProgress({ current: event.currentTarget.currentTime, duration: event.currentTarget.duration || 0 })} onLoadedMetadata={(event) => setProgress({ current: 0, duration: event.currentTarget.duration || 0 })} onEnded={next} />
  return { tracks, currentIndex, currentTrack, isPlaying, progress, status, audio, play, select, next, previous, add, update, setCover, remove, seek }
}

function RoomMiniPlayer({ music, onOpen, lyricsCollapsed, onToggleLyrics }) {
  const { currentTrack, isPlaying, progress } = music
  const lyrics = useMemo(
    () => buildLyricTimeline(currentTrack?.lyrics, progress.duration),
    [currentTrack?.lyrics, progress.duration],
  )
  const activeLyricIndex = useMemo(() => {
    if (!lyrics.length) return -1
    let active = -1
    for (let index = 0; index < lyrics.length; index += 1) {
      if (lyrics[index].time > progress.current) break
      active = index
    }
    return active
  }, [lyrics, progress.current])
  const percent = progress.duration ? Math.min(100, (progress.current / progress.duration) * 100) : 0

  if (!currentTrack) return null

  const lyricStack = activeLyricIndex >= 0
    ? {
        previous: lyrics[activeLyricIndex - 1]?.text || '·',
        current: lyrics[activeLyricIndex]?.text,
        next: lyrics[activeLyricIndex + 1]?.text || '·',
      }
    : lyrics.length
      ? {
          previous: isPlaying ? 'NOW PLAYING' : 'READY TO PLAY',
          current: '♪ 前奏',
          next: lyrics[0]?.text,
        }
    : {
        previous: isPlaying ? 'NOW PLAYING' : 'PAUSED',
        current: '歌词等待你来补充',
        next: '在音乐面板的编辑模式中粘贴 LRC',
      }

  return (
    <motion.aside
      className={`room-mini-player${isPlaying ? ' is-playing' : ''}${lyricsCollapsed ? ' is-collapsed' : ''}`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}
      aria-label="房间音乐播放器"
    >
      <div className="mini-player-head">
        <button className="mini-play-button" onClick={music.play} aria-label={isPlaying ? '暂停音乐' : '播放音乐'}>
          <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
        </button>
        <button className="mini-track-copy" onClick={onOpen} aria-label="打开音乐面板">
          <span>{isPlaying ? 'NOW PLAYING' : 'READY TO PLAY'}</span>
          <strong>{currentTrack.title || '未命名音乐'}</strong>
          <small>{currentTrack.artist || '艺术家等待补充'}</small>
        </button>
        <div className="mini-player-meta">
          <time>{formatTime(progress.current)}</time>
          <button
            className="mini-lyrics-toggle"
            type="button"
            onClick={onToggleLyrics}
            aria-label={lyricsCollapsed ? '展开歌词' : '收起歌词'}
            aria-expanded={!lyricsCollapsed}
            title={lyricsCollapsed ? '展开歌词' : '收起歌词'}
          >
            <span aria-hidden="true">⌃</span>
          </button>
        </div>
      </div>
      <div className="mini-progress" aria-hidden="true"><i style={{ width: `${percent}%` }} /></div>
      <AnimatePresence initial={false}>
        {!lyricsCollapsed && (
          <motion.div
            className={lyrics.length ? 'mini-lyrics' : 'mini-lyrics is-empty'}
            aria-live="polite"
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 74, opacity: 1, marginTop: 9 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>{lyricStack.previous}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.strong
                key={`${currentTrack.id}-${activeLyricIndex}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: .28, ease: 'easeOut' }}
              >
                {lyricStack.current}
              </motion.strong>
            </AnimatePresence>
            <span>{lyricStack.next}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}

function BookExcerptGallery({ bookId, isEditMode, showcaseMode }) {
  const [images, setImages] = useState([])
  const [status, setStatus] = useState('')
  const objectUrls = useRef(new Set())

  useEffect(() => {
    let active = true
    readBookExcerptMedia().then((records) => {
      if (!active) return
      const hydrated = records
        .filter((record) => record.bookId === bookId)
        .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
        .map((record) => hydrateMediaRecord(record, objectUrls.current))
      setImages(hydrated)
    }).catch(() => active && setStatus('摘录图片读取失败'))
    return () => {
      active = false
      objectUrls.current.forEach((url) => window.URL.revokeObjectURL(url))
      objectUrls.current.clear()
    }
  }, [bookId])

  const addImages = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'))
    event.target.value = ''
    if (!files.length) return
    setStatus('正在保存图片…')
    try {
      const startOrder = images.length
      const records = files.map((file, index) => ({
        id: window.crypto.randomUUID(), bookId, title: file.name.replace(/\.[^.]+$/, ''),
        createdAt: Date.now() + index, order: startOrder + index, mediaType: 'image', blob: file,
      }))
      await Promise.all(records.map(writeBookExcerptMedia))
      setImages((current) => [...current, ...records.map((record) => hydrateMediaRecord(record, objectUrls.current))])
      setStatus(`已加入 ${records.length} 张图片`)
    } catch {
      setStatus('摘录图片保存失败')
    }
  }

  const deleteImage = async (image) => {
    try {
      await removeBookExcerptMedia(image.id)
      revokeMediaRecord(image, objectUrls.current)
      setImages((current) => current.filter((entry) => entry.id !== image.id))
      setStatus('图片已移除')
    } catch {
      setStatus('无法移除图片')
    }
  }

  if (!images.length && (!isEditMode || showcaseMode)) return null

  return (
    <section className="reader-excerpt-gallery">
      <header>
        <div><span>EXCERPT IMAGES</span><strong>摘录图片</strong></div>
        {isEditMode && !showcaseMode && images.length > 0 && (
          <label className="reader-excerpt-add">添加图片<input type="file" accept="image/*" multiple onChange={addImages} /></label>
        )}
      </header>
      {status && isEditMode && <small>{status}</small>}
      {images.length ? (
        <div className="reader-excerpt-grid">
          {images.map((image) => (
            <figure key={image.id}>
              <img src={image.objectUrl} alt={image.title || '摘录图片'} loading="lazy" decoding="async" />
              {isEditMode && !showcaseMode && <button onClick={() => deleteImage(image)} aria-label={`删除${image.title || '摘录图片'}`}>×</button>}
            </figure>
          ))}
        </div>
      ) : (
        <label className="reader-excerpt-empty">
          添加书页、手写笔记或相关图片
          <input type="file" accept="image/*" multiple onChange={addImages} />
        </label>
      )}
    </section>
  )
}

function BookReader({ item, isEditMode, onToggleEdit, onClose, showcaseMode }) {
  const [note, setNote] = useState(() => readBookNote(item.id))
  const [saveState, setSaveState] = useState('saved')
  const [transferState, setTransferState] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const importInput = useRef(null)
  const pages = [
    { id: 'guide', eyebrow: 'READING GUIDE', title: '阅读导图' },
    { id: 'excerpt', eyebrow: 'MY EXCERPTS', title: '我的摘录', field: 'excerpt', placeholder: '把真正触动你的原文摘录放在这里。建议只保存必要片段，并标注章节或页码。' },
    { id: 'insight', eyebrow: 'IDEAS & RESPONSE', title: '观点与回应', field: 'insight', placeholder: '这本书提出了什么观点？你同意什么，又质疑什么？' },
  ]
  const activePage = pages[pageIndex]

  useEffect(() => {
    const handlePageKey = (event) => {
      if (event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowLeft') setPageIndex((value) => Math.max(0, value - 1))
      if (event.key === 'ArrowRight') setPageIndex((value) => Math.min(2, value + 1))
    }
    window.addEventListener('keydown', handlePageKey)
    return () => window.removeEventListener('keydown', handlePageKey)
  }, [])

  useEffect(() => {
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      setSaveState(saveBookNote(item.id, note) ? 'saved' : 'error')
    }, 420)
    return () => window.clearTimeout(timer)
  }, [item.id, note])

  const updateNote = (field) => (event) => {
    setNote((current) => ({ ...current, [field]: event.target.value }))
  }

  const goToPage = (nextIndex) => {
    setPageIndex(Math.max(0, Math.min(pages.length - 1, nextIndex)))
  }

  const exportNotes = () => {
    const payload = {
      format: 'my-room-reading-notes',
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: readAllBookNotes(),
    }
    const url = window.URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `my-room-reading-notes-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    setTransferState('备份已下载')
  }

  const importNotes = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const source = parsed?.format === 'my-room-reading-notes' ? parsed.notes : parsed
      if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('invalid notes')
      const cleaned = {}
      Object.entries(source).forEach(([bookId, values]) => {
        if (!/^book-\d+$/.test(bookId) || !values || typeof values !== 'object') return
        cleaned[bookId] = Object.fromEntries(BOOK_NOTE_FIELDS.map((field) => [field, typeof values[field] === 'string' ? values[field] : '']))
      })
      const count = Object.keys(cleaned).length
      if (!count) throw new Error('empty notes')
      window.localStorage.setItem(BOOK_NOTES_STORAGE_KEY, JSON.stringify({ ...readAllBookNotes(), ...cleaned }))
      setNote(readBookNote(item.id))
      setSaveState('saved')
      setTransferState(`已恢复 ${count} 本书`)
    } catch {
      setTransferState('文件无法识别')
    }
  }

  return (
    <motion.div className="book-reader-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
      <motion.section
        className="book-reader"
        initial={{ opacity: 0, y: 28, scale: 0.96, rotateX: -3 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="reader-toolbar">
          <div className="reader-title-lockup">
            <span>{item.eyebrow}</span>
            <strong>{item.fullTitle || item.label}</strong>
          </div>
          <div className="reader-actions">
            {!showcaseMode && <>
              {transferState && <span className="reader-transfer-state">{transferState}</span>}
              {isEditMode && (
                <span className={`reader-save-state ${saveState}`}>
                  {saveState === 'saving' ? '保存中…' : saveState === 'error' ? '保存失败' : '已保存'}
                </span>
              )}
              <button className="reader-utility-button" onClick={exportNotes} title="将全部阅读记录备份为 JSON 文件">备份</button>
              <button className="reader-utility-button" onClick={() => importInput.current?.click()} title="从备份文件恢复阅读记录">恢复</button>
              <input ref={importInput} className="reader-file-input" type="file" accept="application/json,.json" onChange={importNotes} />
              <button className={isEditMode ? 'reader-mode-button active' : 'reader-mode-button'} onClick={onToggleEdit}>
                {isEditMode ? '完成编辑' : '编辑我的内容'}
              </button>
            </>}
            <button className="reader-close" onClick={onClose} aria-label="关闭阅读器">×</button>
          </div>
        </header>

        <div className="reader-spread">
          <aside className="reader-index">
            <div className="reader-cover-frame">
              {item.cover ? <img src={item.cover} alt={`${item.fullTitle || item.label}封面`} /> : <div className="reader-cover-fallback">{item.label}</div>}
            </div>
            <div className="reader-book-meta">
              <strong>{item.author}</strong>
              <span>{item.publisher} · {item.publication}</span>
              <span>ISBN {item.isbn}</span>
            </div>
            <nav aria-label="阅读目录">
              {pages.map((page, index) => (
                <button key={page.id} className={index === pageIndex ? 'active' : ''} onClick={() => goToPage(index)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>{page.title}
                </button>
              ))}
            </nav>
          </aside>

          <main className="reader-paper">
            <div className="reader-page-heading">
              <span>{activePage.eyebrow}</span>
              <h1>{activePage.title}</h1>
            </div>

            {activePage.id === 'guide' ? (
              <article className="reader-guide">
                <p className="reader-lead">{item.readerIntro || item.summary}</p>
                <h2>阅读时可以留意</h2>
                <ul>
                  {(item.readerThemes || ['作者提出的核心问题', '改变你原有判断的观点', '可以带回现实生活的方法']).map((theme) => <li key={theme}>{theme}</li>)}
                </ul>
                <div className="reader-rights-note">
                  <span>关于正文</span>
                  <p>这里展示导读、个人摘录和你的思考。完整原文只在你主动加入有权使用的文本后呈现。</p>
                </div>
              </article>
            ) : (
              <div className={activePage.id === 'excerpt' ? 'reader-excerpt-page' : ''}>
                {isEditMode ? (
                  <label className="reader-editor">
                    <span>正在编辑 · 内容仅保存在当前浏览器</span>
                    <textarea
                      value={note[activePage.field] || ''}
                      onChange={updateNote(activePage.field)}
                      placeholder={activePage.placeholder}
                      spellCheck="true"
                    />
                  </label>
                ) : (
                  <article className={`reader-copy ${note[activePage.field] ? '' : 'is-empty'}`}>
                    {note[activePage.field]
                      ? note[activePage.field].split(/\n+/).map((paragraph, index) => <p key={`${paragraph}-${index}`}>{paragraph}</p>)
                      : <div><span>这一页还没有内容</span><p>{showcaseMode ? '这段阅读记录还在慢慢写下。' : '点击右上角“编辑我的内容”，把它慢慢写成属于你的阅读记录。'}</p></div>}
                  </article>
                )}
                {activePage.id === 'excerpt' && <BookExcerptGallery bookId={item.id} isEditMode={isEditMode} showcaseMode={showcaseMode} />}
              </div>
            )}

            <footer className="reader-pagination">
              <button onClick={() => goToPage(pageIndex - 1)} disabled={pageIndex === 0} aria-label="上一页">←</button>
              <span>{String(pageIndex + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</span>
              <button onClick={() => goToPage(pageIndex + 1)} disabled={pageIndex === pages.length - 1} aria-label="下一页">→</button>
            </footer>
          </main>
        </div>
      </motion.section>
    </motion.div>
  )
}

function PhotoAlbum({ albumKind, title, isEditMode, onToggleEdit, onClose, showcaseMode }) {
  const [photos, setPhotos] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [status, setStatus] = useState('正在读取影像…')
  const fileInput = useRef(null)
  const objectUrls = useRef(new Set())
  const activePhoto = photos[activeIndex]

  useEffect(() => {
    let active = true
    readPhotos()
      .then((records) => {
        if (!active) return
        const hydrated = records
          .filter((record) => record.albumKind === albumKind || (!record.albumKind && albumKind === 'travel'))
          .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
          .map((photo) => hydrateMediaRecord(photo, objectUrls.current))
        setPhotos(hydrated)
        setStatus(hydrated.length ? '' : '还没有影像')
      })
      .catch(() => active && setStatus('浏览器无法读取本地影像'))
    return () => {
      active = false
      objectUrls.current.forEach((url) => window.URL.revokeObjectURL(url))
      objectUrls.current.clear()
    }
  }, [albumKind])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowLeft') setActiveIndex((value) => Math.max(0, value - 1))
      if (event.key === 'ArrowRight') setActiveIndex((value) => Math.min(photos.length - 1, value + 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [photos.length])

  const addPhotos = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
    event.target.value = ''
    if (!files.length) return
    setStatus('正在处理影像…')
    try {
      const startOrder = photos.length
      const records = []
      for (const [index, file] of files.entries()) {
        const isVideo = file.type.startsWith('video/')
        records.push({
          id: window.crypto.randomUUID(),
          title: file.name.replace(/\.[^.]+$/, ''),
          location: '', note: '', date: file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : '',
          createdAt: Date.now() + index, order: startOrder + index, albumKind,
          mediaType: isVideo ? 'video' : 'image', blob: file,
          thumbnailBlob: isVideo ? await createVideoThumbnail(file) : await createImageThumbnail(file),
        })
      }
      await Promise.all(records.map(writePhoto))
      const hydrated = records.map((photo) => hydrateMediaRecord(photo, objectUrls.current))
      setPhotos((current) => [...current, ...hydrated])
      setActiveIndex(startOrder)
      setStatus(`已加入 ${records.length} 项影像`)
    } catch {
      setStatus('影像保存失败')
    }
  }

  const updateActivePhoto = (field, value) => {
    setPhotos((current) => current.map((photo, index) => {
      if (index !== activeIndex) return photo
      const nextPhoto = { ...photo, [field]: value }
      writePhoto(storedPhoto(nextPhoto)).catch(() => setStatus('文字保存失败'))
      return nextPhoto
    }))
  }

  const movePhoto = (direction) => {
    const nextIndex = activeIndex + direction
    if (nextIndex < 0 || nextIndex >= photos.length) return
    const reordered = [...photos]
    ;[reordered[activeIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[activeIndex]]
    const normalized = reordered.map((photo, order) => ({ ...photo, order }))
    setPhotos(normalized)
    setActiveIndex(nextIndex)
    Promise.all(normalized.map((photo) => writePhoto(storedPhoto(photo)))).catch(() => setStatus('排序保存失败'))
  }

  const deleteActivePhoto = async () => {
    if (!activePhoto) return
    try {
      await removePhoto(activePhoto.id)
      revokeMediaRecord(activePhoto, objectUrls.current)
      setPhotos((current) => current.filter((photo) => photo.id !== activePhoto.id))
      setActiveIndex((value) => Math.max(0, Math.min(value, photos.length - 2)))
      setStatus('影像已移除')
    } catch {
      setStatus('无法移除影像')
    }
  }

  const moveActiveToOtherAlbum = async () => {
    if (!activePhoto) return
    const nextAlbumKind = albumKind === 'travel' ? 'life' : 'travel'
    try {
      await writePhoto(storedPhoto({ ...activePhoto, albumKind: nextAlbumKind }))
      revokeMediaRecord(activePhoto, objectUrls.current)
      setPhotos((current) => current.filter((photo) => photo.id !== activePhoto.id))
      setActiveIndex((value) => Math.max(0, Math.min(value, photos.length - 2)))
      setStatus(`已移至${nextAlbumKind === 'travel' ? '旅行相册' : '生活相册'}`)
    } catch {
      setStatus('无法移动这项影像')
    }
  }

  return (
    <motion.div className="album-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
      <motion.section className="photo-album" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .99 }} transition={{ duration: .26, ease: [0.22, 1, 0.36, 1] }}>
        <header className="album-toolbar">
          <div><span>{albumKind === 'travel' ? 'TRAVEL MEMORIES' : 'DAILY MOMENTS'}</span><strong>{title}</strong></div>
          <div className="album-actions">
            {!showcaseMode && <>
              {status && <small>{status}</small>}
              <button onClick={() => fileInput.current?.click()}>添加照片或视频</button>
              <input ref={fileInput} type="file" accept="image/*,video/*" multiple onChange={addPhotos} />
              <button className={isEditMode ? 'active' : ''} onClick={onToggleEdit}>{isEditMode ? '完成整理' : '整理相册'}</button>
            </>}
            <button className="album-close" onClick={onClose} aria-label="关闭相册">×</button>
          </div>
        </header>

        {activePhoto ? (
          <div className="album-layout">
            <div className="album-stage" style={getMediaBackdropStyle(activePhoto)}>
              <MediaStage key={activePhoto.id} media={activePhoto} />
              <button className="album-arrow previous" disabled={activeIndex === 0} onClick={() => setActiveIndex((value) => value - 1)} aria-label="上一项">←</button>
              <button className="album-arrow next" disabled={activeIndex === photos.length - 1} onClick={() => setActiveIndex((value) => value + 1)} aria-label="下一项">→</button>
              <span className="album-count">{String(activeIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span>
            </div>
            <aside className="album-caption">
              <span>MEMORY STORY</span>
              {isEditMode ? (
                <>
                  <label>标题<input value={activePhoto.title} onChange={(event) => updateActivePhoto('title', event.target.value)} /></label>
                  <label>地点<input value={activePhoto.location} onChange={(event) => updateActivePhoto('location', event.target.value)} placeholder="这段影像在哪里记录？" /></label>
                  <label>日期<input type="date" value={activePhoto.date} onChange={(event) => updateActivePhoto('date', event.target.value)} /></label>
                  <label>记忆<textarea value={activePhoto.note} onChange={(event) => updateActivePhoto('note', event.target.value)} placeholder="当时发生了什么？为什么想留下它？" /></label>
                  <div className="album-manage">
                    <button disabled={activeIndex === 0} onClick={() => movePhoto(-1)}>前移</button>
                    <button disabled={activeIndex === photos.length - 1} onClick={() => movePhoto(1)}>后移</button>
                    <button onClick={moveActiveToOtherAlbum}>移至{albumKind === 'travel' ? '生活' : '旅行'}相册</button>
                    <button className="danger" onClick={deleteActivePhoto}>删除</button>
                  </div>
                </>
              ) : (
                <div className="album-story">
                  <h1>{activePhoto.title || '未命名的照片'}</h1>
                  <p className="album-meta">{[activePhoto.location, activePhoto.date].filter(Boolean).join(' · ') || '地点与日期等待补充'}</p>
                  <p>{activePhoto.note || '这段记忆还没有写下说明。'}</p>
                </div>
              )}
            </aside>
            <div className="album-filmstrip">
              {photos.map((photo, index) => <button key={photo.id} className={index === activeIndex ? 'active' : ''} onClick={() => setActiveIndex(index)}><MediaThumbnail media={photo} /></button>)}
            </div>
          </div>
        ) : (
          <div className="album-empty">
            <span>YOUR MEMORIES, IN ONE PLACE</span>
            <h1>把第一段影像放进{albumKind === 'travel' ? '旅行箱' : '生活相册'}</h1>
            <p>照片和视频只保存在这台设备的当前浏览器中，不会上传到网络。</p>
            {!showcaseMode && <button onClick={() => fileInput.current?.click()}>选择本地照片或视频</button>}
          </div>
        )}
      </motion.section>
    </motion.div>
  )
}

function MusicPlayer({ music, isEditMode, onToggleEdit, onClose, showcaseMode }) {
  const audioInput = useRef(null)
  const coverInput = useRef(null)
  const { tracks, currentIndex, currentTrack, isPlaying, progress, status } = music

  const chooseAudio = (event) => {
    music.add(event.target.files)
    event.target.value = ''
  }

  const chooseCover = (event) => {
    music.setCover(event.target.files?.[0])
    event.target.value = ''
  }

  return (
    <motion.div className="music-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
      <motion.section className="music-player" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .99 }} transition={{ duration: .26, ease: [0.22, 1, 0.36, 1] }}>
        <header className="music-toolbar">
          <div><span>LISTEN</span><strong>我的唱片与音乐</strong></div>
          <div className="music-actions">
            {!showcaseMode && <>
              {status && <small>{status}</small>}
              <button onClick={() => audioInput.current?.click()}>添加音乐</button>
              <input ref={audioInput} type="file" accept="audio/*" multiple onChange={chooseAudio} />
              <button className={isEditMode ? 'active' : ''} onClick={onToggleEdit}>{isEditMode ? '完成整理' : '整理曲库'}</button>
            </>}
            <button className="music-close" onClick={onClose} aria-label="关闭音乐面板">×</button>
          </div>
        </header>

        {currentTrack ? (
          <div className="music-layout">
            <div className="now-playing">
              <div className={isPlaying ? 'record-art spinning' : 'record-art'}>
                {currentTrack.coverUrl ? <img src={currentTrack.coverUrl} alt={`${currentTrack.title}封面`} /> : <div className="record-fallback"><i /><span>MY ROOM</span></div>}
              </div>
              <div className="now-playing-copy">
                <span>NOW PLAYING</span>
                <h1>{currentTrack.title || '未命名音乐'}</h1>
                <p>{currentTrack.artist || '艺术家等待补充'}{currentTrack.album ? ` · ${currentTrack.album}` : ''}</p>
              </div>
            </div>

            <aside className="track-library">
              <div className="track-library-heading"><span>LIBRARY</span><strong>{tracks.length} TRACKS</strong></div>
              <div className="track-list">
                {tracks.map((track, index) => (
                  <button key={track.id} className={index === currentIndex ? 'active' : ''} onClick={() => music.select(index, isPlaying)}>
                    <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{track.title}</strong><small>{track.artist || '未填写艺术家'}</small></div>
                  </button>
                ))}
              </div>
            </aside>

            <div className="music-details">
              {isEditMode ? (
                <div className="track-editor">
                  <label>歌名<input value={currentTrack.title} onChange={(event) => music.update('title', event.target.value)} /></label>
                  <label>艺术家<input value={currentTrack.artist} onChange={(event) => music.update('artist', event.target.value)} /></label>
                  <label>专辑<input value={currentTrack.album} onChange={(event) => music.update('album', event.target.value)} /></label>
                  <label>为什么喜欢<textarea value={currentTrack.note} onChange={(event) => music.update('note', event.target.value)} /></label>
                  <label className="lyrics-editor">同步歌词（LRC）<textarea value={currentTrack.lyrics || ''} onChange={(event) => music.update('lyrics', event.target.value)} placeholder={'[00:12.00] 第一行歌词\n[00:17.50] 第二行歌词'} /><small>推荐粘贴带时间的 LRC；普通逐行文本会按歌曲时长自动均分。</small></label>
                  <div><button onClick={() => coverInput.current?.click()}>更换封面</button><input ref={coverInput} type="file" accept="image/*" onChange={chooseCover} /><button className="danger" onClick={music.remove}>删除音乐</button></div>
                </div>
              ) : <p>{currentTrack.note || '这首歌为什么会留在你的房间里，等待你来写。'}</p>}
            </div>

            <footer className="player-controls">
              <button onClick={music.previous} aria-label="上一首">←</button>
              <button className="play-button" onClick={music.play} aria-label={isPlaying ? '暂停' : '播放'}>{isPlaying ? 'Ⅱ' : '▶'}</button>
              <button onClick={music.next} aria-label="下一首">→</button>
              <span>{formatTime(progress.current)}</span>
              <input type="range" min="0" max={progress.duration || 0} step="0.1" value={Math.min(progress.current, progress.duration || 0)} onChange={(event) => music.seek(event.target.value)} aria-label="播放进度" />
              <span>{formatTime(progress.duration)}</span>
            </footer>
          </div>
        ) : (
          <div className="music-empty">
            <div className="empty-record"><i /></div>
            <span>BUILD YOUR PERSONAL SOUNDTRACK</span>
            <h1>放入第一张属于你的唱片</h1>
            <p>支持浏览器可播放的 MP3、M4A、WAV、OGG 等本地音频；音乐不会上传。</p>
            {!showcaseMode && <button onClick={() => audioInput.current?.click()}>选择本地音乐</button>}
          </div>
        )}
      </motion.section>
    </motion.div>
  )
}

function WhiteboardStory({ content, onChange, onToggleEdit, onClose }) {
  const [saveState, setSaveState] = useState('已保存在本机')
  const logoInput = useRef(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(WHITEBOARD_STORAGE_KEY, JSON.stringify(content))
        setSaveState('已保存在本机')
      } catch {
        setSaveState('浏览器无法保存')
      }
    }, 240)
    return () => window.clearTimeout(timer)
  }, [content])

  const update = (field, value) => {
    setSaveState('正在保存…')
    onChange((current) => ({ ...current, [field]: value }))
  }

  const chooseLogo = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, 768 / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        update('logo', canvas.toDataURL('image/webp', .9))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  return (
    <motion.div className="whiteboard-editor-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
      <motion.aside className="whiteboard-editor-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: .26, ease: [0.22, 1, 0.36, 1] }}>
        <header className="whiteboard-editor-toolbar">
          <div><span>EDIT ON BOARD</span><strong>编辑白板内容</strong></div>
          <div className="whiteboard-editor-actions">
            <small>{saveState}</small>
            <button onClick={onToggleEdit}>完成</button>
            <button className="whiteboard-editor-close" onClick={onClose} aria-label="关闭白板编辑">×</button>
          </div>
        </header>
        <div className="whiteboard-logo-editor">
          <img src={content.logo} alt="当前白板图片" />
          <div><strong>白板图片</strong><span>会直接显示在实体白板右侧</span></div>
          <button onClick={() => logoInput.current?.click()}>更换图片</button>
          <input ref={logoInput} type="file" accept="image/*" onChange={chooseLogo} />
        </div>
        <div className="whiteboard-fields">
          <label>主标题<input value={content.title} onChange={(event) => update('title', event.target.value)} /></label>
          <label>介绍<textarea value={content.lead} onChange={(event) => update('lead', event.target.value)} /></label>
          <label>补充介绍<textarea value={content.story} onChange={(event) => update('story', event.target.value)} /></label>
          <label>语录<textarea value={content.motto} onChange={(event) => update('motto', event.target.value)} /></label>
          <label>关键词<input value={content.keywords} onChange={(event) => update('keywords', event.target.value)} /></label>
          <label>英文签名<input value={content.signature} onChange={(event) => update('signature', event.target.value)} /></label>
          <div className="whiteboard-editor-note"><span>LIVE PREVIEW</span><p>修改会实时绘制到镜头中的白板；访客无需点击就能看到这些内容。</p></div>
        </div>
      </motion.aside>
    </motion.div>
  )
}

function WhiteboardFocusTools({ onEdit, onClose, showcaseMode }) {
  return (
    <motion.div className="whiteboard-focus-tools" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      <span>文字与图片已经直接呈现在白板上</span>
      {!showcaseMode && <button onClick={onEdit}>编辑白板</button>}
      <button onClick={onClose}>返回房间</button>
    </motion.div>
  )
}

function MobileWhiteboardReader({ content, onEdit, onClose, showcaseMode }) {
  return (
    <motion.section
      className="mobile-whiteboard-reader"
      initial={{ opacity: 0, y: 18, scale: .985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: .99 }}
      transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}
      aria-label="白板高清阅读"
    >
      <header>
        <div><span>ABOUT THIS ROOM</span><strong>白板近景</strong></div>
        <button onClick={onClose} aria-label="返回实体白板">×</button>
      </header>
      <div className="mobile-whiteboard-content">
        <div className="mobile-whiteboard-copy">
          <h1>{content.title}</h1>
          <strong>{content.lead}</strong>
          <p>{content.story}</p>
          <blockquote>“{content.motto}”</blockquote>
          <div className="mobile-whiteboard-keywords">{content.keywords}</div>
          <small>{content.signature}</small>
        </div>
        <figure><img src={content.logo} alt="白板个人标志" /></figure>
      </div>
      <footer>
        <span>{showcaseMode ? '访客阅读模式' : '文字与图片会同步保存到这台设备'}</span>
        {!showcaseMode && <button onClick={onEdit}>编辑白板</button>}
        <button onClick={onClose}>返回白板</button>
      </footer>
    </motion.section>
  )
}

function MobileWhiteboardFocusTools({ onRead, onEdit, onClose, showcaseMode }) {
  return (
    <motion.div
      className="mobile-whiteboard-focus-tools"
      initial={{ opacity: 0, x: '-50%', y: 14 }}
      animate={{ opacity: 1, x: '-50%', y: 0 }}
      exit={{ opacity: 0, x: '-50%', y: 10 }}
      aria-label="白板实体近景控制"
    >
      <span><b>实体白板</b><small>双指可继续缩放查看</small></span>
      <button className="primary" onClick={onRead}>高清阅读</button>
      {!showcaseMode && <button onClick={onEdit}>编辑</button>}
      <button onClick={onClose}>返回</button>
    </motion.div>
  )
}

function ShelfFocusPanel({ onSelectBook, onClose }) {
  return (
    <motion.section
      className="shelf-focus-panel"
      initial={{ opacity: 0, x: '-50%', y: 20 }}
      animate={{ opacity: 1, x: '-50%', y: 0 }}
      exit={{ opacity: 0, x: '-50%', y: 14 }}
      transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}
      aria-label="书架近景"
    >
      <header>
        <div><span>READING SHELF</span><strong>选择一本书</strong><small>点击书脊或下方封面进入阅读</small></div>
        <button onClick={onClose}>返回房间</button>
      </header>
      <div className="shelf-book-strip">
        {books.map((book, index) => (
          <button key={book.id} onClick={() => onSelectBook(book.id)} aria-label={`打开${book.label}`}>
            <i style={{ '--spine-color': book.spine?.base || book.color, '--spine-accent': book.spine?.accent || '#c7ac78' }}>
              {book.cover ? <img src={book.cover} alt="" /> : <b>{String(index + 1).padStart(2, '0')}</b>}
            </i>
            <span>{book.label}</span>
          </button>
        ))}
      </div>
    </motion.section>
  )
}

function SportIllustration({ kind }) {
  return kind === 'running' ? (
    <div className="sport-illustration running-art" aria-hidden="true">
      <span className="running-sun" />
      <span className="running-horizon" />
      <i className="track-line line-one" />
      <i className="track-line line-two" />
      <i className="track-line line-three" />
      <div className="runner-mark"><i /><b /><span /><em /></div>
      <small>KEEP MOVING</small>
    </div>
  ) : (
    <div className="sport-illustration badminton-art" aria-hidden="true">
      <span className="court-line court-one" />
      <span className="court-line court-two" />
      <span className="court-line court-three" />
      <i className="court-net" />
      <div className="racket-mark"><b /><i /></div>
      <div className="shuttle-mark"><i /><i /><i /><span /></div>
      <small>PLAY THE NEXT SHOT</small>
    </div>
  )
}

function SportJournal({ kind, content, onChange, isEditMode, onToggleEdit, onClose, showcaseMode }) {
  const isRunning = kind === 'running'
  const [photos, setPhotos] = useState([])
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [photoStatus, setPhotoStatus] = useState('正在读取影像…')
  const photoInput = useRef(null)
  const photoUrls = useRef(new Set())
  const activePhoto = photos[activePhotoIndex]
  const labels = isRunning
    ? ['跑步频率', '里程节点', '下一个目标']
    : ['打球频率', '重要经历', '下一个目标']
  const fields = ['frequency', 'milestone', 'target']
  const update = (field, value) => onChange((current) => ({ ...current, [field]: value }))

  useEffect(() => {
    let active = true
    readSportPhotos().then((records) => {
      if (!active) return
      const hydrated = records
        .filter((photo) => photo.kind === kind)
        .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
        .map((photo) => hydrateMediaRecord(photo, photoUrls.current))
      setPhotos(hydrated)
      setPhotoStatus(hydrated.length ? '' : '还没有运动影像')
    }).catch(() => active && setPhotoStatus('浏览器无法读取运动影像'))
    return () => {
      active = false
      photoUrls.current.forEach((url) => window.URL.revokeObjectURL(url))
      photoUrls.current.clear()
    }
  }, [kind])

  const addPhotos = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
    event.target.value = ''
    if (!files.length) return
    setPhotoStatus('正在处理影像…')
    try {
      const startOrder = photos.length
      const records = []
      for (const [index, file] of files.entries()) {
        const isVideo = file.type.startsWith('video/')
        records.push({
          id: window.crypto.randomUUID(), kind, title: file.name.replace(/\.[^.]+$/, ''), note: '',
          createdAt: Date.now() + index, order: startOrder + index, blob: file,
          mediaType: isVideo ? 'video' : 'image',
          thumbnailBlob: isVideo ? await createVideoThumbnail(file) : await createImageThumbnail(file),
        })
      }
      await Promise.all(records.map(writeSportPhoto))
      const hydrated = records.map((photo) => hydrateMediaRecord(photo, photoUrls.current))
      setPhotos((current) => [...current, ...hydrated])
      setActivePhotoIndex(startOrder)
      setPhotoStatus(`已加入 ${records.length} 项影像`)
    } catch {
      setPhotoStatus('影像保存失败')
    }
  }

  const updatePhoto = (field, value) => {
    setPhotos((current) => current.map((photo, index) => {
      if (index !== activePhotoIndex) return photo
      const nextPhoto = { ...photo, [field]: value }
      writeSportPhoto(storedSportPhoto(nextPhoto)).catch(() => setPhotoStatus('照片说明保存失败'))
      return nextPhoto
    }))
  }

  const deletePhoto = async () => {
    if (!activePhoto) return
    try {
      await removeSportPhoto(activePhoto.id)
      revokeMediaRecord(activePhoto, photoUrls.current)
      setPhotos((current) => current.filter((photo) => photo.id !== activePhoto.id))
      setActivePhotoIndex((value) => Math.max(0, Math.min(value, photos.length - 2)))
      setPhotoStatus('影像已移除')
    } catch {
      setPhotoStatus('无法移除影像')
    }
  }

  return (
    <motion.div className={`sport-shell ${kind}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
      <motion.section className="sport-journal" initial={{ opacity: 0, y: 18, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .99 }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}>
        <header className="sport-toolbar">
          <div><span>{isRunning ? 'MOVE / RUN' : 'PLAY / BADMINTON'}</span><strong>{isRunning ? '我的跑步档案' : '我的羽毛球档案'}</strong></div>
          <div className="sport-actions">
            {!showcaseMode && <>
              <small>内容自动保存在本机</small>
              <button className={isEditMode ? 'active' : ''} onClick={onToggleEdit}>{isEditMode ? '完成编辑' : '编辑内容'}</button>
            </>}
            <button className="sport-close" onClick={onClose} aria-label="关闭运动档案">×</button>
          </div>
        </header>

        <div className="sport-layout">
          <article className="sport-hero">
            <section className="sport-gallery sport-gallery-feature">
              <header>
                <div><span>MOMENTS IN MOTION</span><h2>运动生活相册</h2></div>
                <div>
                  {photoStatus && <small>{photoStatus}</small>}
                  {isEditMode && <button onClick={() => photoInput.current?.click()}>添加照片或视频</button>}
                  <input ref={photoInput} type="file" accept="image/*,video/*" multiple onChange={addPhotos} />
                </div>
              </header>
              {activePhoto ? (
                <>
                  <div className="sport-photo-stage" style={getMediaBackdropStyle(activePhoto)}>
                    <MediaStage key={activePhoto.id} media={activePhoto} />
                    <button className="previous" disabled={activePhotoIndex === 0} onClick={() => setActivePhotoIndex((value) => value - 1)} aria-label="上一项">←</button>
                    <button className="next" disabled={activePhotoIndex === photos.length - 1} onClick={() => setActivePhotoIndex((value) => value + 1)} aria-label="下一项">→</button>
                    <span>{String(activePhotoIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span>
                  </div>
                  {isEditMode ? (
                    <div className="sport-photo-editor">
                      <label>标题<input value={activePhoto.title} onChange={(event) => updatePhoto('title', event.target.value)} /></label>
                      <label>这段记录的故事<textarea value={activePhoto.note} onChange={(event) => updatePhoto('note', event.target.value)} placeholder="记录这次跑步或这一场球。" /></label>
                      <button onClick={deletePhoto}>删除</button>
                    </div>
                  ) : (
                    <div className="sport-photo-caption"><strong>{activePhoto.title || '运动中的一刻'}</strong><p>{activePhoto.note || '这张照片的故事等待写下。'}</p></div>
                  )}
                  {photos.length > 1 && <div className="sport-photo-strip">{photos.map((photo, index) => <button key={photo.id} className={index === activePhotoIndex ? 'active' : ''} onClick={() => setActivePhotoIndex(index)}><MediaThumbnail media={photo} /></button>)}</div>}
                </>
              ) : (
                <div className="sport-photo-placeholder">
                  <SportIllustration kind={kind} />
                  <button disabled={!isEditMode} onClick={() => photoInput.current?.click()}>
                    <span>{isEditMode ? '添加第一段运动影像' : '影像等待主人加入'}</span>
                    <small>支持照片与视频，这整块区域会成为你的运动相册</small>
                  </button>
                </div>
              )}
            </section>
            <div className="sport-title">
              <span>{isRunning ? 'RUNNING NOTES' : 'COURT NOTES'}</span>
              {isEditMode ? (
                <div className="sport-title-editor">
                  <label>标题<input value={content.title} onChange={(event) => update('title', event.target.value)} /></label>
                  <label>一句介绍<textarea value={content.lead} onChange={(event) => update('lead', event.target.value)} /></label>
                  <label>留给自己的话<input value={content.quote} onChange={(event) => update('quote', event.target.value)} /></label>
                </div>
              ) : (
                <>
                  <h1>{content.title}</h1>
                  <p>{content.lead}</p>
                  <blockquote>“{content.quote}”</blockquote>
                </>
              )}
            </div>
          </article>

          <aside className="sport-record">
            <div className="sport-metrics">
              {fields.map((field, index) => (
                <div key={field} className="sport-metric">
                  <span>0{index + 1} / {labels[index]}</span>
                  {isEditMode
                    ? <input value={content[field]} onChange={(event) => update(field, event.target.value)} />
                    : <strong className={content[field] === '等待填写' ? 'is-empty' : ''}>{content[field]}</strong>}
                </div>
              ))}
            </div>

            <div className="sport-stories">
              <section>
                <span>WHY I LOVE IT</span>
                <h2>为什么喜欢</h2>
                {isEditMode
                  ? <textarea value={content.meaning} onChange={(event) => update('meaning', event.target.value)} />
                  : <p>{content.meaning}</p>}
              </section>
              <section>
                <span>A MEMORY</span>
                <h2>一段记忆</h2>
                {isEditMode
                  ? <textarea value={content.memory} onChange={(event) => update('memory', event.target.value)} />
                  : <p>{content.memory}</p>}
              </section>
            </div>

          </aside>
        </div>
      </motion.section>
    </motion.div>
  )
}

function CodeDesk({ isEditMode, onToggleEdit, onClose, showcaseMode }) {
  const [projects, setProjects] = useState(readCodeProjects)
  const [activeId, setActiveId] = useState(() => readCodeProjects()[0]?.id)
  const [saveState, setSaveState] = useState('已保存在本机')
  const activeProject = projects.find((project) => project.id === activeId) || projects[0]

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(CODE_PROJECTS_STORAGE_KEY, JSON.stringify(projects))
        setSaveState('已保存在本机')
      } catch {
        setSaveState('浏览器无法保存')
      }
    }, 240)
    return () => window.clearTimeout(timer)
  }, [projects])

  const updateProject = (field, value) => {
    setSaveState('正在保存…')
    setProjects((current) => current.map((project) => project.id === activeProject.id ? { ...project, [field]: value } : project))
  }

  const addProject = () => {
    const id = window.crypto.randomUUID()
    const nextProject = {
      id,
      title: '新的项目',
      kicker: 'PERSONAL PROJECT',
      description: '用一句话说明它解决了什么问题，或者它为什么值得被做出来。',
      stack: '技术与工具',
      language: 'JS',
      note: '在这里记录项目背后的故事。',
      code: `// 把最能代表这个项目的一段代码放在这里\nfunction createSomethingMeaningful() {\n  return 'your idea'\n}`,
    }
    setProjects((current) => [...current, nextProject])
    setActiveId(id)
  }

  const deleteProject = () => {
    if (projects.length <= 1) return
    const index = projects.findIndex((project) => project.id === activeProject.id)
    const remaining = projects.filter((project) => project.id !== activeProject.id)
    setProjects(remaining)
    setActiveId(remaining[Math.max(0, index - 1)].id)
  }

  if (!activeProject) return null
  const codeLines = activeProject.code.split('\n')

  return (
    <motion.div className="code-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
      <motion.section className="code-desk" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .99 }} transition={{ duration: .26, ease: [0.22, 1, 0.36, 1] }}>
        <header className="code-toolbar">
          <div><span>CREATE</span><strong>项目与代码</strong></div>
          <div className="code-actions">
            {!showcaseMode && <>
              <small>{saveState}</small>
              {isEditMode && <button onClick={addProject}>添加项目</button>}
              <button className={isEditMode ? 'active' : ''} onClick={onToggleEdit}>{isEditMode ? '完成编辑' : '编辑内容'}</button>
            </>}
            <button className="code-close" onClick={onClose} aria-label="关闭项目面板">×</button>
          </div>
        </header>

        <div className="code-layout">
          <aside className="project-index">
            <div className="project-index-heading"><span>PROJECTS</span><strong>{String(projects.length).padStart(2, '0')}</strong></div>
            <nav>
              {projects.map((project, index) => (
                <button key={project.id} className={project.id === activeProject.id ? 'active' : ''} onClick={() => setActiveId(project.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{project.title || '未命名项目'}</strong><small>{project.kicker || 'PROJECT'}</small></div>
                </button>
              ))}
            </nav>
          </aside>

          <article className="project-story">
            {isEditMode ? (
              <div className="project-editor">
                <label>项目名称<input value={activeProject.title} onChange={(event) => updateProject('title', event.target.value)} /></label>
                <label>项目类型<input value={activeProject.kicker} onChange={(event) => updateProject('kicker', event.target.value)} /></label>
                <label>项目简介<textarea value={activeProject.description} onChange={(event) => updateProject('description', event.target.value)} /></label>
                <label>技术栈<input value={activeProject.stack} onChange={(event) => updateProject('stack', event.target.value)} /></label>
                <label>个人说明<textarea value={activeProject.note} onChange={(event) => updateProject('note', event.target.value)} /></label>
                <button className="project-delete" disabled={projects.length <= 1} onClick={deleteProject}>删除这个项目</button>
              </div>
            ) : (
              <div className="project-copy">
                <span>{activeProject.kicker}</span>
                <h1>{activeProject.title}</h1>
                <p>{activeProject.description}</p>
                <div className="stack-line"><span>BUILT WITH</span><strong>{activeProject.stack}</strong></div>
                <blockquote>{activeProject.note}</blockquote>
              </div>
            )}
          </article>

          <section className="code-window">
            <header><i /><i /><i /><span>showcase.{activeProject.language.toLowerCase()}</span><em>{activeProject.language}</em></header>
            {isEditMode ? (
              <textarea spellCheck="false" value={activeProject.code} onChange={(event) => updateProject('code', event.target.value)} aria-label="项目代码" />
            ) : (
              <pre>{codeLines.map((line, index) => <code key={`${index}-${line}`}><span>{String(index + 1).padStart(2, '0')}</span>{line || ' '}</code>)}</pre>
            )}
            <footer><span>● READY</span><strong>{codeLines.length} LINES</strong></footer>
          </section>
        </div>
      </motion.section>
    </motion.div>
  )
}

const GAME_THEATRE_DURATION = 12

function GameTheatre({ kind, onClose }) {
  const isEldenRing = kind === 'eldenRing'
  const [started, setStarted] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(false)
  const startTime = useRef(0)
  const audioSession = useRef(null)
  const poster = isEldenRing
    ? publicAsset('assets/games/elden-ring-poster-source.jpg')
    : publicAsset('assets/games/expedition-33-poster-source.jpg')

  const stopSound = useCallback(() => {
    const session = audioSession.current
    if (!session) return
    try {
      session.gain.gain.cancelScheduledValues(session.context.currentTime)
      session.gain.gain.setTargetAtTime(.0001, session.context.currentTime, .035)
      window.setTimeout(() => session.context.close(), 180)
    } catch { /* Audio can already be closed after a replay. */ }
    audioSession.current = null
  }, [])

  const startSound = useCallback(() => {
    stopSound()
    if (muted) return
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      const context = new AudioContextClass()
      const gain = context.createGain()
      const filter = context.createBiquadFilter()
      const now = context.currentTime
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(isEldenRing ? 260 : 420, now)
      filter.frequency.exponentialRampToValueAtTime(isEldenRing ? 1400 : 2100, now + 8.4)
      gain.gain.setValueAtTime(.0001, now)
      gain.gain.exponentialRampToValueAtTime(.045, now + 2.2)
      gain.gain.setValueAtTime(.045, now + 8.7)
      gain.gain.exponentialRampToValueAtTime(.0001, now + 11.8)
      filter.connect(gain).connect(context.destination)
      ;(isEldenRing ? [55, 82.41, 110] : [65.41, 98, 146.83]).forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        oscillator.type = isEldenRing ? (index === 1 ? 'sine' : 'triangle') : (index === 2 ? 'sine' : 'triangle')
        oscillator.frequency.setValueAtTime(frequency, now)
        oscillator.detune.setValueAtTime(index * 4 - 3, now)
        oscillator.connect(filter)
        oscillator.start(now)
        oscillator.stop(now + 12)
      })
      const chime = context.createOscillator()
      const chimeGain = context.createGain()
      chime.type = 'sine'
      chime.frequency.setValueAtTime(isEldenRing ? 440 : 523.25, now + 7.7)
      chime.frequency.exponentialRampToValueAtTime(isEldenRing ? 1760 : 2093, now + 8.8)
      chimeGain.gain.setValueAtTime(.0001, now)
      chimeGain.gain.setValueAtTime(.0001, now + 7.65)
      chimeGain.gain.exponentialRampToValueAtTime(.07, now + 8.05)
      chimeGain.gain.exponentialRampToValueAtTime(.0001, now + 9.4)
      chime.connect(chimeGain).connect(context.destination)
      chime.start(now)
      chime.stop(now + 9.5)
      audioSession.current = { context, gain }
    } catch {
      audioSession.current = null
    }
  }, [isEldenRing, muted, stopSound])

  useEffect(() => stopSound, [stopSound])

  useEffect(() => {
    if (muted) stopSound()
  }, [muted, stopSound])

  useEffect(() => {
    if (!started) return undefined
    startTime.current = performance.now()
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - startTime.current) / 1000
      const nextProgress = Math.min(1, elapsed / GAME_THEATRE_DURATION)
      setProgress(nextProgress)
      if (nextProgress >= 1) {
        window.clearInterval(timer)
        stopSound()
        setStarted(false)
      }
    }, 80)
    return () => window.clearInterval(timer)
  }, [runKey, started, stopSound])

  const play = () => {
    setProgress(0)
    setRunKey((value) => value + 1)
    setStarted(true)
    startSound()
  }

  const close = () => {
    stopSound()
    onClose()
  }

  return (
    <motion.div className={`game-theatre ${isEldenRing ? 'elden-theatre' : 'expedition-theatre'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .28 }}>
      <div key={runKey} className={`theatre-visual ${started ? 'is-running' : ''}`}>
        <img className="theatre-backdrop" src={poster} alt="" />
        <div className="theatre-vignette" />
        {isEldenRing ? (
          <>
            <div className="gold-motes" aria-hidden="true">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ '--x': `${(index * 37) % 100}%`, '--y': `${(index * 61) % 100}%`, '--delay': `${(index % 11) * .17}s`, '--drift': `${18 + (index % 7) * 9}px` }} />)}</div>
            <div className="elden-sigil" aria-hidden="true"><i /><i /><i /><span /></div>
            <div className="grace-tree" aria-hidden="true"><i /><i /><i /><i /><b /></div>
            <div className="theatre-copy">
              <span>VISUAL STUDY · 01</span>
              <h1>ELDEN RING</h1>
              <p>黄金的秩序破碎之后，仍有人循着赐福前行。</p>
            </div>
          </>
        ) : (
          <>
            <div className="expedition-wash" aria-hidden="true"><i /><i /><i /><i /></div>
            <div className="expedition-disc" aria-hidden="true" />
            <div className="expedition-number" aria-hidden="true"><span>3</span><span>3</span></div>
            <div className="expedition-petals" aria-hidden="true">{Array.from({ length: 34 }, (_, index) => <i key={index} style={{ '--x': `${(index * 41) % 104 - 2}%`, '--delay': `${(index % 12) * .16}s`, '--fall': `${36 + (index % 8) * 11}px`, '--turn': `${80 + (index % 6) * 52}deg` }} />)}</div>
            <div className="expedition-party" aria-hidden="true"><i /><i /><i /><i /></div>
            <div className="theatre-copy expedition-copy">
              <span>VISUAL STUDY · 02</span>
              <h1>CLAIR OBSCUR</h1>
              <p>当明天不再理所当然，仍有人选择出发。</p>
            </div>
          </>
        )}
      </div>

      {!started && (
        <div className="theatre-ready">
          <span>{progress >= 1 ? 'PREVIS COMPLETE' : '12 SECOND VISUAL STUDY'}</span>
          <strong>{progress >= 1 ? '视觉预演结束' : (isEldenRing ? '准备进入交界地' : '第 33 次远征，即将启程')}</strong>
          <button onClick={play}>{progress >= 1 ? '再次播放' : '开始预演'}</button>
        </div>
      )}

      <header className="theatre-toolbar">
        <div><span>GAME THEATRE</span><strong>{isEldenRing ? '艾尔登法环 · 黑金预演' : '光与影：33号远征队 · 绘画预演'}</strong></div>
        <div>
          <button onClick={() => setMuted((value) => !value)}>{muted ? '开启音景' : '关闭音景'}</button>
          <button onClick={play}>{started ? '重新播放' : '播放'}</button>
          <button onClick={close}>返回房间</button>
        </div>
      </header>
      <div className="theatre-progress"><i style={{ transform: `scaleX(${progress})` }} /></div>
    </motion.div>
  )
}

function DetailPanel({ item, onClose, onSelectBook, isEditMode, onToggleEdit, music, whiteboardContent, onWhiteboardChange, sportContent, onSportChange, showcaseMode }) {
  const [ready, setReady] = useState(false)
  const [mobileWhiteboardView, setMobileWhiteboardView] = useState('focus')
  const compact = window.matchMedia('(max-width: 720px)').matches

  useEffect(() => {
    const delay = compact ? (item.type === 'book' ? 360 : 430) : (item.type === 'book' ? 620 : 720)
    const timer = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(timer)
  }, [compact, item.id, item.type])

  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {ready && (
        item.id === 'bookshelf' ? (
          <ShelfFocusPanel onSelectBook={onSelectBook} onClose={onClose} />
        ) : item.type === 'book' ? (
          <BookReader item={item} isEditMode={isEditMode} onToggleEdit={onToggleEdit} onClose={onClose} showcaseMode={showcaseMode} />
        ) : item.albumKind ? (
          <PhotoAlbum albumKind={item.albumKind} title={item.albumTitle} isEditMode={isEditMode} onToggleEdit={onToggleEdit} onClose={onClose} showcaseMode={showcaseMode} />
        ) : item.id === 'music' ? (
          <MusicPlayer music={music} isEditMode={isEditMode} onToggleEdit={onToggleEdit} onClose={onClose} showcaseMode={showcaseMode} />
        ) : item.id === 'computer' ? (
          <CodeDesk isEditMode={isEditMode} onToggleEdit={onToggleEdit} onClose={onClose} showcaseMode={showcaseMode} />
        ) : item.id === 'running' || item.id === 'badminton' ? (
          <SportJournal kind={item.id} content={sportContent[item.id]} onChange={(updater) => onSportChange((current) => ({ ...current, [item.id]: updater(current[item.id]) }))} isEditMode={isEditMode} onToggleEdit={onToggleEdit} onClose={onClose} showcaseMode={showcaseMode} />
        ) : item.id === 'eldenRing' || item.id === 'expedition33' ? (
          <GameTheatre kind={item.id} onClose={onClose} />
        ) : item.id === 'whiteboard' ? (
          compact ? (
            mobileWhiteboardView === 'reader'
              ? <MobileWhiteboardReader content={whiteboardContent} onEdit={() => setMobileWhiteboardView('edit')} onClose={() => setMobileWhiteboardView('focus')} showcaseMode={showcaseMode} />
              : mobileWhiteboardView === 'edit'
                ? <WhiteboardStory content={whiteboardContent} onChange={onWhiteboardChange} onToggleEdit={() => setMobileWhiteboardView('focus')} onClose={onClose} />
                : <MobileWhiteboardFocusTools onRead={() => setMobileWhiteboardView('reader')} onEdit={() => setMobileWhiteboardView('edit')} onClose={onClose} showcaseMode={showcaseMode} />
          ) : isEditMode
            ? <WhiteboardStory content={whiteboardContent} onChange={onWhiteboardChange} onToggleEdit={onToggleEdit} onClose={onClose} />
            : <WhiteboardFocusTools onEdit={onToggleEdit} onClose={onClose} showcaseMode={showcaseMode} />
        ) : <motion.div className="detail-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.aside
            className="detail-panel"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <button className="close-button" onClick={onClose} aria-label="关闭内容">×</button>
            <span className="detail-eyebrow">{item.eyebrow}</span>
            <div className="detail-rule" style={{ background: item.accent }} />
            <h1>{item.fullTitle || item.label}</h1>
            <p>{item.summary}</p>
            <div className="placeholder-card">
              <span>CONTENT MODULE</span>
              <strong>内容编辑功能将在下一阶段接入</strong>
            </div>
            <small>按 Esc 或点击关闭按钮返回之前的视角</small>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const [selectedId, setSelectedId] = useState(() => typeof window.history.state?.roomOverlay === 'string' ? window.history.state.roomOverlay : null)
  const [isVisitorEntry] = useState(() => new URLSearchParams(window.location.search).get('view') === '1')
  const [isShowcaseMode, setIsShowcaseMode] = useState(() => new URLSearchParams(window.location.search).get('view') === '1')
  const [isShowcasePreview, setIsShowcasePreview] = useState(false)
  const [isPersonalCopy, setIsPersonalCopy] = useState(false)
  const [copyExists, setCopyExists] = useState(() => {
    try { return window.localStorage.getItem(VISITOR_COPY_STORAGE_KEY) === 'true' } catch { return false }
  })
  const [showCopyNotice, setShowCopyNotice] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const [canvasMounted, setCanvasMounted] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [whiteboardContent, setWhiteboardContent] = useState(readWhiteboardContent)
  const [sportContent, setSportContent] = useState(readSportContent)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'false' } catch { return true }
  })
  const [miniPlayerLyricsCollapsed, setMiniPlayerLyricsCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(MINI_PLAYER_LYRICS_STORAGE_KEY)
      return stored === null ? window.matchMedia('(max-width: 720px)').matches : stored === 'true'
    } catch {
      return window.matchMedia('(max-width: 720px)').matches
    }
  })
  const [showIntro, setShowIntro] = useState(() => {
    try { return window.localStorage.getItem(INTRO_STORAGE_KEY) !== 'true' } catch { return true }
  })
  const [isEditMode, setIsEditMode] = useState(() => {
    try {
      return window.localStorage.getItem(EDIT_MODE_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const selectedItem = useMemo(() => getRoomItem(selectedId), [selectedId])
  const music = useMusicLibrary()
  const playInterfaceSound = useInterfaceSound(soundEnabled)
  const markSceneReady = useCallback(() => setSceneReady(true), [])

  const completeIntro = useCallback(() => {
    setShowIntro(false)
    try { window.localStorage.setItem(INTRO_STORAGE_KEY, 'true') } catch { /* intro can replay in restricted browsing modes */ }
  }, [])

  const selectItem = useCallback((id) => {
    if (!id) {
      if (window.history.state?.roomOverlay) window.history.back()
      else setSelectedId(null)
      return
    }
    playInterfaceSound()
    if (window.history.state?.roomOverlay !== id) {
      window.history.pushState({ ...window.history.state, roomOverlay: id }, '', window.location.href)
    }
    setSelectedId(id)
  }, [playInterfaceSound])

  const closeSelectedItem = useCallback(() => {
    if (window.history.state?.roomOverlay) window.history.back()
    else setSelectedId(null)
  }, [])

  const enterShowcasePreview = useCallback(() => {
    setIsEditMode(false)
    setSelectedId(null)
    setIsShowcasePreview(true)
    setIsShowcaseMode(true)
  }, [])

  const leaveShowcasePreview = useCallback(() => {
    setIsShowcasePreview(false)
    setIsShowcaseMode(false)
  }, [])

  const activatePersonalCopy = useCallback(() => {
    try { window.localStorage.setItem(VISITOR_COPY_STORAGE_KEY, 'true') } catch { /* The copy still works for this session. */ }
    setCopyExists(true)
    setIsPersonalCopy(true)
    setIsShowcasePreview(false)
    setIsShowcaseMode(false)
    setIsEditMode(true)
    setShowCopyNotice(true)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setCanvasMounted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const handlePopState = (event) => setSelectedId(typeof event.state?.roomOverlay === 'string' ? event.state.roomOverlay : null)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(EDIT_MODE_STORAGE_KEY, String(isEditMode))
    } catch {
      // The room remains usable when private browsing blocks local storage.
    }
  }, [isEditMode])

  useEffect(() => {
    try { window.localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled)) } catch { /* sound preference is optional */ }
  }, [soundEnabled])

  useEffect(() => {
    try { window.localStorage.setItem(MINI_PLAYER_LYRICS_STORAGE_KEY, String(miniPlayerLyricsCollapsed)) } catch { /* compact player preference is optional */ }
  }, [miniPlayerLyricsCollapsed])

  useEffect(() => {
    if (!sceneReady || !showIntro) return undefined
    const timer = window.setTimeout(completeIntro, 3600)
    return () => window.clearTimeout(timer)
  }, [completeIntro, sceneReady, showIntro])

  useEffect(() => {
    if (!showCopyNotice) return undefined
    const timer = window.setTimeout(() => setShowCopyNotice(false), 4600)
    return () => window.clearTimeout(timer)
  }, [showCopyNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(WHITEBOARD_STORAGE_KEY, JSON.stringify(whiteboardContent))
      } catch {
        // The live board still works when local storage is restricted.
      }
    }, 240)
    return () => window.clearTimeout(timer)
  }, [whiteboardContent])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(SPORT_STORAGE_KEY, JSON.stringify(sportContent))
      } catch {
        // Sport entries remain editable for the current session when storage is unavailable.
      }
    }, 240)
    return () => window.clearTimeout(timer)
  }, [sportContent])

  const resetView = () => {
    if (selectedId) closeSelectedItem()
    setResetToken((value) => value + 1)
  }

  return (
    <main className={`app-shell${isShowcaseMode ? ' is-showcase' : ''}${isPersonalCopy ? ' is-personal-copy' : ''}`}>
      {music.audio}
      {canvasMounted && (
        <Suspense fallback={null}>
          <RoomCanvas selectedId={selectedId} onSelect={selectItem} resetToken={resetToken} onReady={markSceneReady} isMusicPlaying={music.isPlaying} whiteboardContent={whiteboardContent} />
        </Suspense>
      )}
      {!sceneReady && <LoadingScreen />}
      <AnimatePresence>{sceneReady && showIntro && <IntroSequence onComplete={completeIntro} />}</AnimatePresence>

      <header className="room-header">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <div>
          <strong>MY ROOM</strong>
          <span>THINGS THAT MOVE ME</span>
        </div>
      </header>

      <AnimatePresence>
        {sceneReady && !showIntro && !selectedItem && (
          <RoomMiniPlayer
            music={music}
            onOpen={() => selectItem('music')}
            lyricsCollapsed={miniPlayerLyricsCollapsed}
            onToggleLyrics={() => setMiniPlayerLyricsCollapsed((value) => !value)}
          />
        )}
      </AnimatePresence>

      <div className="room-controls">
        {!isShowcaseMode && <>
          <button
            className={isEditMode ? 'mode-button active' : 'mode-button'}
            onClick={() => setIsEditMode((value) => !value)}
            aria-pressed={isEditMode}
          >
            {isEditMode ? '完成编辑' : '编辑内容'}
          </button>
          <button onClick={enterShowcasePreview}>{isPersonalCopy ? '预览我的版本' : '预览展示'}</button>
        </>}
        {isShowcaseMode && !isShowcasePreview && isVisitorEntry && (
          <button className="create-copy-button" onClick={activatePersonalCopy}>{copyExists ? '继续编辑我的版本' : '创建我的版本'}</button>
        )}
        {isShowcasePreview && <button className="showcase-exit-button" onClick={leaveShowcasePreview}>退出展示</button>}
        <button className={soundEnabled ? 'sound-button active' : 'sound-button'} onClick={() => setSoundEnabled((value) => !value)} aria-pressed={soundEnabled} title="界面提示音，不影响唱片音乐">
          {soundEnabled ? '声音开启' : '声音静音'}
        </button>
        <button onClick={resetView}>重置视角</button>
        <span>{isShowcaseMode ? '拖动探索 · 点击物品 · 返回键回到房间' : isPersonalCopy ? '这是你的独立副本 · 修改仅保存在这台设备' : isEditMode ? '编辑内容会自动保存在本机' : '拖动查看 · 滚轮缩放 · 点击物品'}</span>
      </div>

      {!isShowcaseMode && !isPersonalCopy && <div className="phase-badge">V2.4 · MOBILE FOCUS</div>}
      {isPersonalCopy && !isShowcaseMode && <div className="personal-copy-badge"><i />我的副本<span>仅保存在此设备</span></div>}

      <AnimatePresence>
        {showCopyNotice && (
          <motion.div className="copy-notice" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <strong>你的独立副本已经创建</strong>
            <span>现在可以修改书籍、照片、音乐、白板、运动档案和代码内容；这些改动不会影响原房间或其他访客。</span>
            <button onClick={() => setShowCopyNotice(false)} aria-label="关闭提示">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedItem && <DetailPanel key={selectedItem.id} item={selectedItem} onSelectBook={selectItem} music={music} whiteboardContent={whiteboardContent} onWhiteboardChange={setWhiteboardContent} sportContent={sportContent} onSportChange={setSportContent} isEditMode={isShowcaseMode ? false : isEditMode} onToggleEdit={() => setIsEditMode((value) => !value)} onClose={closeSelectedItem} showcaseMode={isShowcaseMode} />}
    </main>
  )
}

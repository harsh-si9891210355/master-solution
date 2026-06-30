import { useState, useRef, useCallback, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const PX_PER_MIN = 2.2   // pixels per minute row - reduced for 24hr view (1440min * 2.2 ≈ 3168px height)

function fmtTime(totalMin: number, secs = false) {
  const h    = Math.floor(totalMin / 60)
  const m    = totalMin % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const hh   = h === 0 ? 12 : h > 12 ? h - 12 : h
  const mm   = String(m).padStart(2, '0')
  return secs ? `${hh}:${mm}:07 ${ampm}` : `${hh}:${mm} ${ampm}`
}

// Generate full 24 hours of minutes (from 11:59 PM down to 12:00 AM)
const ALL_MINS: number[] = []
for (let h = 23; h >= 0; h--) {
  for (let m = 59; m >= 0; m--) {
    ALL_MINS.push(h * 60 + m)
  }
}
const CANVAS_H = ALL_MINS.length * PX_PER_MIN

// Detection events across 24hrs
const DETECTIONS: Record<number, { icon: string; thumb: string; label: string }> = {
  620: {
    icon: 'directions_car',
    thumb: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=120&q=70',
    label: 'BTU7946',
  },
  590: {
    icon: 'directions_walk',
    thumb: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=120&q=70',
    label: '',
  },
  552: {
    icon: 'directions_walk',
    thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=70',
    label: 'BTU7946',
  },
  1380: {
    icon: 'directions_car',
    thumb: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=120&q=70',
    label: 'XYZ9021',
  },
  720: {
    icon: 'directions_walk',
    thumb: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&q=70',
    label: 'PED5678',
  },
  1140: {
    icon: 'directions_car',
    thumb: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=120&q=70',
    label: 'CAR3344',
  },
}

// Continuous blue activity bars across 24hrs
const BARS: [number, number][] = [
  [610, 632], [583, 601], [552, 572],
  [720, 745], [960, 990], [1320, 1360],
]

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export default function Events() {
  const [tab,      setTab]      = useState<'timeline' | 'detections'>('timeline')
  const [playing,  setPlaying]  = useState(false)
  const [cur,      setCur]      = useState(615)
  const [dragging, setDragging] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [aspectRatio, setAspectRatio] = useState<'cover' | 'contain' | 'fill'>('cover')
  const [volume, _setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [isGridView, setIsGridView] = useState(false)

  const tlRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLImageElement>(null)

  function minToY(m: number) {
    const i = ALL_MINS.indexOf(m)
    return i >= 0 ? i * PX_PER_MIN + PX_PER_MIN / 2 : 0
  }

  function clientYToMin(clientY: number) {
    if (!tlRef.current) return cur
    const { top } = tlRef.current.getBoundingClientRect()
    const rel     = clientY - top + tlRef.current.scrollTop
    const idx     = Math.max(0, Math.min(ALL_MINS.length - 1, Math.round(rel / PX_PER_MIN)))
    return ALL_MINS[idx]
  }

  useEffect(() => {
    if (!tlRef.current) return
    const i = ALL_MINS.indexOf(cur)
    tlRef.current.scrollTop = Math.max(0, i * PX_PER_MIN - tlRef.current.clientHeight / 2)
  }, [])

  const onMove = useCallback((e: MouseEvent) => {
    if (dragging) setCur(clientYToMin(e.clientY))
  }, [dragging])
  const onUp   = useCallback(() => setDragging(false), [])

  useEffect(() => {
    if (dragging) { window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp) }
    return ()     => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging, onMove, onUp])

  const curY = minToY(cur)

  // Playback controls
  const handlePlayPause = () => setPlaying(!playing)
  const handleReplay10 = () => {
    const newTime = Math.max(0, cur - 10)
    setCur(newTime)
    const i = ALL_MINS.indexOf(newTime)
    if (tlRef.current && i >= 0) {
      tlRef.current.scrollTop = Math.max(0, i * PX_PER_MIN - tlRef.current.clientHeight / 2)
    }
  }
  const handleForward10 = () => {
    const newTime = Math.min(1440, cur + 10)
    setCur(newTime)
    const i = ALL_MINS.indexOf(newTime)
    if (tlRef.current && i >= 0) {
      tlRef.current.scrollTop = Math.max(0, i * PX_PER_MIN - tlRef.current.clientHeight / 2)
    }
  }
  const handleSkipPrevious = () => {
    const newTime = Math.max(0, cur - 60)
    setCur(newTime)
    const i = ALL_MINS.indexOf(newTime)
    if (tlRef.current && i >= 0) {
      tlRef.current.scrollTop = Math.max(0, i * PX_PER_MIN - tlRef.current.clientHeight / 2)
    }
  }
  const handleSkipNext = () => {
    const newTime = Math.min(1440, cur + 60)
    setCur(newTime)
    const i = ALL_MINS.indexOf(newTime)
    if (tlRef.current && i >= 0) {
      tlRef.current.scrollTop = Math.max(0, i * PX_PER_MIN - tlRef.current.clientHeight / 2)
    }
  }
  const handlePlaybackRate = () => {
    const rates = [1, 1.5, 2, 4, 8, 16]
    const currentIndex = rates.indexOf(playbackRate)
    const nextRate = rates[(currentIndex + 1) % rates.length]
    setPlaybackRate(nextRate)
  }

  // Additional control handlers
  const handleAspectRatio = () => {
    const ratios: Array<'cover' | 'contain' | 'fill'> = ['cover', 'contain', 'fill']
    const currentIndex = ratios.indexOf(aspectRatio)
    const nextRatio = ratios[(currentIndex + 1) % ratios.length]
    setAspectRatio(nextRatio)
  }

  const handleVolumeToggle = () => {
    setIsMuted(!isMuted)
  }

  const handleFullscreen = () => {
    if (!videoContainerRef.current) return
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleScreenshot = () => {
    if (!videoRef.current) return
    
    // Create a canvas to capture the image
    const canvas = document.createElement('canvas')
    const img = videoRef.current
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Download the image
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `screenshot-${fmtTime(cur, true).replace(/[:\s]/g, '-')}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
      })
    }
  }

  const handleGridView = () => {
    setIsGridView(!isGridView)
  }

  const handleExport = () => {
    // Placeholder for export functionality
    const startTime = fmtTime(Math.max(0, cur - 30))
    const endTime = fmtTime(Math.min(1440, cur + 30))
    alert(`Export video clip:\nFrom: ${startTime}\nTo: ${endTime}\n\nThis would export the selected time range.`)
  }

  return (
    <div className="flex flex-col bg-white overflow-hidden h-full min-h-0 max-h-screen">
      {/* Material Icons CDN - ensure icons load */}
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />

      {/* TOP HEADER - Removed account_tree and videocam buttons */}
      <div className="flex items-center justify-between px-5 bg-white border-b border-gray-200 flex-shrink-0 h-12">
        <span className="text-xs font-bold tracking-widest text-gray-800 uppercase">
          Event Information
        </span>
        {/* Empty div to maintain spacing - buttons removed */}
        <div className="flex items-center gap-1"></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT — Video Player with 16:9 ratio - constrained size */}
        <div ref={videoContainerRef} className="flex flex-col overflow-hidden bg-black min-h-0" style={{ width: '100%', maxWidth: '70vw' }}>
          
          {/* Video Area */}
          <div className="relative overflow-hidden bg-gray-900 aspect-video max-h-[80vh] min-h-[60vh]">
            <img
              ref={videoRef}
              src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1400&q=85"
              alt="Camera feed"
              className="w-full h-full"
              style={{ objectFit: aspectRatio }}
            />
            {/* Timestamp overlay on video */}
            <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-md text-sm font-mono">
              {fmtTime(cur, true)}
            </div>
            {/* Aspect ratio indicator */}
            {aspectRatio !== 'cover' && (
              <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
                {aspectRatio === 'contain' ? 'Fit' : 'Fill'}
              </div>
            )}
            {/* Muted indicator */}
            {isMuted && (
              <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">volume_off</span>
                Muted
              </div>
            )}
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-2 px-4 bg-white border-t border-gray-200 flex-shrink-0 h-14">
            
            {/* Camera badge */}
            <div className="flex items-center gap-2 mr-3 flex-shrink-0">
              <div className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm">videocam</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold text-gray-800">B1 Parking</span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Playback Controls - properly styled buttons */}
            <PlayerButton icon="skip_previous" onClick={handleSkipPrevious} label="Previous" />
            <PlayerButton icon="replay_10" onClick={handleReplay10} label="Replay 10s" />
            
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-2xl">
                {playing ? 'pause' : 'play_arrow'}
              </span>
            </button>
            
            <PlayerButton icon="forward_10" onClick={handleForward10} label="Forward 10s" />
            <PlayerButton icon="skip_next" onClick={handleSkipNext} label="Next" />

            {/* Divider */}
            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Extra Controls */}
            <PlayerButton icon="aspect_ratio" onClick={handleAspectRatio} label="Aspect Ratio" />
            <PlayerButton 
              icon={isMuted ? "volume_off" : volume > 50 ? "volume_up" : volume > 0 ? "volume_down" : "volume_mute"} 
              onClick={handleVolumeToggle} 
              label={isMuted ? "Unmute" : "Mute"} 
            />
            
            <button
              onClick={handlePlaybackRate}
              className="h-8 px-2 text-xs font-bold rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              {playbackRate}x
            </button>
            
            <PlayerButton icon="fullscreen" onClick={handleFullscreen} label="Fullscreen" />
            <PlayerButton icon="camera_alt" onClick={handleScreenshot} label="Screenshot" />

            {/* Right group - Grid and Export buttons */}
            <div className="ml-auto flex items-center gap-0.5">
              <PlayerButton 
                icon="grid_view" 
                onClick={handleGridView} 
                label="Grid View" 
              />
              <PlayerButton icon="file_upload" onClick={handleExport} label="Export" />
            </div>
          </div>
        </div>

        {/* RIGHT — Timeline Panel (24hr scrollable) */}
        <div className="flex flex-col flex-1 bg-white border-l border-gray-200 overflow-hidden">
          
          {/* Date Header */}
          <div className="flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0 h-11">
            <button className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors">
              Thursday, November 21
              <span className="material-symbols-outlined text-base">keyboard_arrow_down</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-gray-400 text-sm">zoom_out</span>
              <div className="relative w-14 h-1.5 bg-gray-200 rounded-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-gray-400 rounded-full shadow" />
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">zoom_in</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            {(['timeline', 'detections'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                  tab === t
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Scrollable Timeline */}
          <div ref={tlRef}
            className="flex-1 overflow-y-auto relative"
            style={{ scrollbarWidth: 'thin' }}
            onClick={e => { if (!dragging) setCur(clientYToMin(e.clientY)) }}>
            
            <div className="relative" style={{ height: CANVAS_H }}>
              
              {/* Activity Bars */}
              {BARS.map(([s, e], i) => {
                const t = minToY(s) - PX_PER_MIN / 2
                const h = (minToY(e) + PX_PER_MIN / 2) - t
                if (h <= 0) return null
                return (
                  <div key={i} className="absolute rounded-full bg-blue-500 opacity-70"
                    style={{ left: 86, width: 4, top: t, height: h }} />
                )
              })}

              {/* Timeline Rows */}
              {ALL_MINS.map((m, idx) => {
                const y    = idx * PX_PER_MIN
                const min  = m % 60
                const is10 = min % 10 === 0
                const isHr = min === 0
                const det  = DETECTIONS[m]
                
                return (
                  <div key={m}
                    className="absolute w-full flex items-center cursor-pointer hover:bg-blue-50/30 transition-colors"
                    style={{ top: y, height: PX_PER_MIN }}>
                    
                    {/* Time Label */}
                    <div className="flex-shrink-0 text-right select-none w-[72px] pr-1.5">
                      {is10 && (
                        <span className={`text-xs leading-none whitespace-nowrap ${
                          isHr ? 'font-bold text-gray-800' : 'text-gray-400'
                        }`}>
                          {fmtTime(m)}
                        </span>
                      )}
                    </div>

                    {/* Tick */}
                    <div className="relative flex-shrink-0 flex items-center w-3.5">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2"
                        style={{
                          width: is10 ? 10 : 5,
                          height: 1,
                          background: is10 ? '#9ca3af' : '#e2e8f0',
                        }} />
                    </div>

                    {/* Vertical Spine */}
                    <div className="w-px h-full bg-gray-100 flex-shrink-0" />

                    {/* Detection Dot */}
                    {det && (
                      <div className="flex-shrink-0 rounded-full z-10 -ml-1 w-2 h-2 bg-blue-500 border-2 border-white shadow-[0_0_0_1.5px_#3b82f6]" />
                    )}

                    {/* Detection Icon */}
                    {det?.icon && (
                      <span className="material-symbols-outlined text-gray-400 ml-2 flex-shrink-0 text-sm">
                        {det.icon}
                      </span>
                    )}

                    {/* Thumbnail */}
                    {det?.thumb && (
                      <div className="ml-auto mr-3 flex flex-col items-end gap-0.5 flex-shrink-0">
                        <img src={det.thumb} alt="detection"
                          className="rounded border border-gray-200 shadow-sm object-cover w-14 h-10" />
                        {det.label && (
                          <span className="text-xs text-gray-500 font-medium">{det.label}</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Current Time Slider */}
              <div className="absolute inset-x-0 z-30 pointer-events-none"
                style={{ top: curY, transform: 'translateY(-50%)' }}>
                
                <div className="absolute inset-x-0 h-0.5 top-1/2 -translate-y-1/2 bg-blue-500 shadow-sm" />

                <div onMouseDown={e => { e.preventDefault(); setDragging(true) }}
                  className="absolute rounded-full bg-blue-600 shadow-md pointer-events-auto transition-transform hover:scale-110"
                  style={{
                    left: 84, width: 14, height: 14,
                    top: '50%', transform: 'translate(-50%,-50%)',
                    cursor: dragging ? 'grabbing' : 'grab',
                    zIndex: 40,
                  }} />

                <div className="absolute flex items-center font-bold text-white rounded-full shadow-lg pointer-events-none"
                  style={{
                    left: 0, top: '50%', transform: 'translateY(-50%)',
                    background: '#1e40af',
                    fontSize: 11,
                    padding: '4px 12px',
                    whiteSpace: 'nowrap',
                    borderRadius: 20,
                  }}>
                  {fmtTime(cur, true)}
                </div>
              </div>

              {/* Day Separators */}
              <div className="absolute inset-x-3 flex items-center gap-2" style={{ top: minToY(720) - 20 }}>
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-500 font-medium bg-white px-2 whitespace-nowrap">
                  Midday • 12:00 PM
                </span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              <div className="absolute inset-x-3 flex items-center gap-2" style={{ bottom: 20 }}>
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-500 font-medium bg-white px-2 whitespace-nowrap">
                  End of Day • 11:59 PM
                </span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>
            </div>
          </div>

          {/* Timeline Footer */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-2 text-center text-[10px] text-gray-400">
            Scroll for full 24-hour timeline
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Custom Button Component with Material Icons
// ─────────────────────────────────────────────────────────────
interface PlayerButtonProps {
  icon: string
  onClick: () => void
  label?: string
  red?: boolean
}

function PlayerButton({ icon, onClick, label, red }: PlayerButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-md transition-all hover:bg-gray-100 flex-shrink-0 ${
        red ? 'text-gray-500 hover:text-red-500' : 'text-gray-600 hover:text-blue-600'
      }`}
      title={label}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </button>
  )
}

// Legacy IBtn removed
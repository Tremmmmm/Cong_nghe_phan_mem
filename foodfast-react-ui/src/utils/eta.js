// src/utils/eta.js
// Ước tính thời gian giao hàng (phút) theo mode + số lượng món + khung giờ
// Đây là mock FE, không gọi AI thật.

function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)) }
function jitter(n, j=3){ // +/- j phút
  const r = (Math.random()*2-1) * j
  return Math.round(n + r)
}

export function estimateETA({ deliveryMode = 'DRIVER', itemCount = 1, createdAt } = {}) {
  const now = new Date()
  const base = (deliveryMode === 'DRONE') ? 24 : 45 // phút gốc
  const hour = now.getHours()

  // giờ cao điểm
  const peak = (hour>=11 && hour<=13) || (hour>=17 && hour<=20)
  const peakAdd = (deliveryMode === 'DRONE') ? 5 : 10

  // thêm theo số món (mỗi 2 món +1′)
  const addByItems = Math.floor(Math.max(0, itemCount-1) / 2)

  let minutes = base + addByItems + (peak ? peakAdd : 0)
  minutes = jitter(minutes, (deliveryMode==='DRONE') ? 2 : 4)
  minutes = clamp(minutes, (deliveryMode==='DRONE')?18:30, 90)

  // cửa sổ giao: ±5′
  const window = 5
  const min = clamp(minutes - window, 10, 120)
  const max = clamp(minutes + window, 15, 150)

  const startTs = createdAt ? (new Date(createdAt)).getTime() : Date.now()
  const arriveTs = startTs + minutes*60*1000

  return { minutes, windowMin: min, windowMax: max, arriveTs }
}

export function etaWindowLabel({ windowMin, windowMax }){
  return `~${windowMin}–${windowMax}′`
}

export function formatArrivalClock(ts){
  const d = new Date(ts)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function formatCountdown(ms){
  if (ms <= 0) return '00:00'
  const total = Math.floor(ms/1000)
  const m = String(Math.floor(total/60)).padStart(2,'0')
  const s = String(total%60).padStart(2,'0')
  return `${m}:${s}`
}

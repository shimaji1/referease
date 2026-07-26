'use client'
import { useState, useEffect, useCallback } from 'react'

// Rough postal-code → lat/lng for Ontario FSAs (first 3 chars).
// Not exhaustive; hits GTA/Southern Ontario well, degrades gracefully elsewhere.
const FSA_CENTERS = {
  M1: [43.75, -79.23], M2: [43.78, -79.42], M3: [43.75, -79.44], M4: [43.70, -79.36],
  M5: [43.65, -79.38], M6: [43.68, -79.44], M8: [43.63, -79.51], M9: [43.72, -79.55],
  L1: [43.94, -78.90], L3: [44.03, -79.42], L4: [43.85, -79.51], L5: [43.58, -79.68],
  L6: [43.68, -79.76], L7: [43.53, -79.85], L8: [43.24, -79.87], L9: [43.30, -79.79],
  K1: [45.42, -75.70], K2: [45.34, -75.75], K7: [44.23, -76.48], N2: [43.45, -80.49],
  N6: [42.98, -81.24], P3: [46.49, -80.98], P7: [48.38, -89.25],
}

const geocodeFromPostal = (raw) => {
  if (!raw) return null
  const fsa = raw.replace(/\s/g, '').toUpperCase().slice(0, 2)
  return FSA_CENTERS[fsa] || null
}

export default function useLocation() {
  const [loc, setLoc] = useState(null)          // { lat, lng, source: 'geo' | 'postal' | 'manual', label }
  const [status, setStatus] = useState('idle')  // idle | requesting | granted | denied | error

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('re-loc')
      if (raw) { const p = JSON.parse(raw); if (p?.lat && p?.lng) setLoc(p) }
    } catch {}
  }, [])

  const save = useCallback((p) => {
    setLoc(p)
    try { localStorage.setItem('re-loc', JSON.stringify(p)) } catch {}
  }, [])

  const clear = useCallback(() => {
    setLoc(null)
    try { localStorage.removeItem('re-loc') } catch {}
  }, [])

  const requestGeo = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setStatus('error'); return }
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setStatus('granted'); save({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'geo', label: 'Your location' }) },
      () => { setStatus('denied') },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    )
  }, [save])

  const setPostal = useCallback((postal) => {
    const g = geocodeFromPostal(postal)
    if (!g) return false
    save({ lat: g[0], lng: g[1], source: 'postal', label: postal.trim().toUpperCase() })
    return true
  }, [save])

  return { loc, status, requestGeo, setPostal, clear }
}

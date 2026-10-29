// apps/web/src/hooks/useGuildPlayer.ts
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { GuildPlayerState } from '@musicbot/shared'

const SOCKET_URL = process.env.NEXT_PUBLIC_BOT_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')

const defaultState = (guildId: string): GuildPlayerState => ({
  guildId,
  isPlaying: false,
  isPaused: false,
  volume: 100,
  repeatMode: 0,
  position: 0,
  duration: 0,
  voiceChannelId: null,
  voiceChannelName: null,
  currentTrack: null,
  queue: [],
  updatedAt: Date.now(),
})

export type ControlActionInput =
  | { action: 'play'; query: string }
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'skip' }
  | { action: 'stop' }
  | { action: 'shuffle' }
  | { action: 'volume'; value: number }
  | { action: 'loop'; mode: 0 | 1 | 2 | 3 }
  | { action: 'seek'; positionMS: number }
  | { action: 'removeTrack'; trackIndex: number }
  | { action: 'jumpTo'; trackIndex: number }

export function useGuildPlayer(guildId: string) {
  const [playerState, setPlayerState] = useState<GuildPlayerState>(() => defaultState(guildId))
  const [interpolatedPosition, setInterpolatedPosition] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)

  const socketRef = useRef<Socket | null>(null)
  const lastStateTimestampRef = useRef<number>(Date.now())
  const lastKnownPositionRef = useRef<number>(0)

  // 1. Initial State Hydration via API
  const fetchState = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/music/${guildId}`)
      if (!res.ok) {
        throw new Error(`Failed to load player state (${res.status})`)
      }
      const data: GuildPlayerState = await res.json()
      setPlayerState(data)
      setInterpolatedPosition(data.position)
      lastKnownPositionRef.current = data.position
      lastStateTimestampRef.current = Date.now()
      setError(null)
    } catch (err) {
      console.error('[useGuildPlayer] Initial fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to player')
    } finally {
      setIsLoading(false)
    }
  }, [guildId])

  // 2. Setup Socket.io real-time connection
  useEffect(() => {
    if (!guildId) return

    fetchState()

    const socket = io(SOCKET_URL, {
      query: { guildId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join:guild', guildId)
      socket.emit('join-guild', guildId)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('player:state-update', (updatedState: GuildPlayerState) => {
      if (updatedState.guildId === guildId) {
        setPlayerState(updatedState)
        setInterpolatedPosition(updatedState.position)
        lastKnownPositionRef.current = updatedState.position
        lastStateTimestampRef.current = Date.now()
      }
    })

    return () => {
      socket.emit('leave:guild', guildId)
      socket.emit('leave-guild', guildId)
      socket.disconnect()
      socketRef.current = null
    }
  }, [guildId, fetchState])

  // 3. Smooth 250ms progress interpolation
  useEffect(() => {
    if (!playerState.isPlaying || playerState.isPaused || !playerState.currentTrack) {
      setInterpolatedPosition(playerState.position)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastStateTimestampRef.current
      const currentCalculated = lastKnownPositionRef.current + elapsed
      const maxDuration = playerState.currentTrack?.durationMS || 0

      if (maxDuration > 0 && currentCalculated >= maxDuration) {
        setInterpolatedPosition(maxDuration)
      } else {
        setInterpolatedPosition(currentCalculated)
      }
    }, 250)

    return () => clearInterval(interval)
  }, [playerState.isPlaying, playerState.isPaused, playerState.currentTrack, playerState.position])

  // 4. Send Control Action
  const sendControl = useCallback(
    async (action: ControlActionInput): Promise<boolean> => {
      try {
        setIsActionLoading(true)
        setError(null)

        // Optimistic local update for quick feedback
        if (action.action === 'pause') {
          setPlayerState((prev) => ({ ...prev, isPaused: true }))
        } else if (action.action === 'resume') {
          setPlayerState((prev) => ({ ...prev, isPaused: false }))
        } else if (action.action === 'volume') {
          setPlayerState((prev) => ({ ...prev, volume: action.value }))
        } else if (action.action === 'loop') {
          setPlayerState((prev) => ({ ...prev, repeatMode: action.mode }))
        } else if (action.action === 'seek') {
          setInterpolatedPosition(action.positionMS)
          lastKnownPositionRef.current = action.positionMS
          lastStateTimestampRef.current = Date.now()
        }

        const res = await fetch(`/api/music/${guildId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText }))
          throw new Error(errData.error || `Control action failed (${res.status})`)
        }

        const newState: GuildPlayerState = await res.json()
        setPlayerState(newState)
        setInterpolatedPosition(newState.position)
        lastKnownPositionRef.current = newState.position
        lastStateTimestampRef.current = Date.now()
        return true
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Control request failed'
        setError(errorMsg)
        console.error('[useGuildPlayer] sendControl error:', err)
        fetchState()
        return false
      } finally {
        setIsActionLoading(false)
      }
    },
    [guildId, fetchState]
  )

  return {
    playerState,
    interpolatedPosition,
    isLoading,
    isActionLoading,
    isConnected,
    error,
    clearError: () => setError(null),
    sendControl,
    refresh: fetchState,
  }
}

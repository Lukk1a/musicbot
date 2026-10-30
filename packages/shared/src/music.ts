// packages/shared/src/music.ts

export interface SerializedTrack {
  id: string
  title: string
  author: string
  duration: string
  durationMS: number
  thumbnail: string
  url: string
  requestedBy: {
    id: string
    username: string
    avatar?: string
  } | null
}

export type RepeatMode = 0 | 1 | 2 | 3

export enum QueueRepeatMode {
  OFF = 0,
  TRACK = 1,
  QUEUE = 2,
  AUTOPLAY = 3,
}

export interface GuildPlayerState {
  guildId: string
  isPlaying: boolean
  isPaused: boolean
  volume: number
  repeatMode: 0 | 1 | 2 | 3 // OFF, TRACK, QUEUE, AUTOPLAY
  position: number
  duration: number
  voiceChannelId: string | null
  voiceChannelName: string | null
  currentTrack: SerializedTrack | null
  queue: SerializedTrack[]
  updatedAt: number
}

export type PlayerControlAction =
  | { action: 'play'; query: string; userId: string }
  | { action: 'pause'; userId: string }
  | { action: 'resume'; userId: string }
  | { action: 'skip'; userId: string }
  | { action: 'stop'; userId: string }
  | { action: 'shuffle'; userId: string }
  | { action: 'volume'; value: number; userId: string }
  | { action: 'loop'; mode: 0 | 1 | 2 | 3; userId: string }
  | { action: 'seek'; positionMS: number; userId: string }
  | { action: 'removeTrack'; trackIndex: number; userId: string }
  | { action: 'jumpTo'; trackIndex: number; userId: string }

export interface VoiceAuthVerificationResult {
  authorized: boolean
  error?: string
  voiceChannelId?: string | null
}

export interface MutualGuildStatus {
  id: string
  name: string
  icon: string | null
  botPresent: boolean
  hasManageGuild: boolean
  isPlaying: boolean
  currentTrack: SerializedTrack | null
  memberCount?: number
}

export interface ServerPlaylistTrack {
  id: string
  title: string
  author: string
  duration: string
  durationMS: number
  thumbnail: string
  url: string
  addedBy: {
    id: string
    username: string
    avatar?: string
  }
  addedAt: number
}

export interface ServerPlaylist {
  id: string
  guildId: string
  name: string
  description?: string | null
  createdBy: {
    id: string
    username: string
    avatar?: string
  }
  tracks: ServerPlaylistTrack[]
  createdAt?: Date | string | number
  updatedAt?: Date | string | number
}

export interface GuildMusicConfigData {
  guildId: string
  djRoleId: string | null
  playlistEditorRoleId: string | null
  allowPublicContributions: boolean
  defaultVolume: number
  twentyFourSeven: boolean
  textChannelId: string | null
}

export interface SpotifyUserProfile {
  id: string
  display_name: string
  email?: string
  images?: { url: string; height?: number; width?: number }[]
}

export interface SpotifyUserPlaylist {
  id: string
  name: string
  description: string | null
  images: { url: string; height?: number; width?: number }[]
  owner: { display_name: string; id: string }
  tracks: { total: number }
  external_urls: { spotify: string }
}

export interface SpotifyTrackItem {
  id: string
  name: string
  artists: { name: string; id: string }[]
  album: {
    name: string
    images: { url: string; height?: number; width?: number }[]
  }
  duration_ms: number
  external_urls: { spotify: string }
  uri: string
}

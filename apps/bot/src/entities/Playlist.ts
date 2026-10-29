// apps/bot/src/entities/Playlist.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 as uuidv4 } from 'uuid'

import { CustomBaseEntity } from './BaseEntity'
import type { SerializedTrack } from '@musicbot/shared'

@Entity()
export class Playlist extends CustomBaseEntity {

	@PrimaryKey({ type: 'string' })
	id: string = uuidv4()

	@Property({ type: 'string' })
	userId!: string

	@Property({ type: 'string' })
	name!: string

	@Property({ type: 'json' })
	tracks: SerializedTrack[] = []

	constructor(userId?: string, name?: string, tracks?: SerializedTrack[]) {
		super()
		if (userId)
			this.userId = userId
		if (name)
			this.name = name
		if (tracks)
			this.tracks = tracks
	}

}

// apps/bot/src/entities/ServerPlaylist.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 as uuidv4 } from 'uuid'

import { CustomBaseEntity } from './BaseEntity'
import type { ServerPlaylistTrack } from '@musicbot/shared'

@Entity()
export class ServerPlaylist extends CustomBaseEntity {

	@PrimaryKey({ type: 'string' })
	id: string = uuidv4()

	@Property({ type: 'string' })
	guildId!: string

	@Property({ type: 'string' })
	name!: string

	@Property({ nullable: true, type: 'string' })
	description?: string | null = null

	@Property({ type: 'json' })
	createdBy!: {
		id: string
		username: string
		avatar?: string
	}

	@Property({ type: 'json' })
	tracks: ServerPlaylistTrack[] = []

	constructor(
		guildId?: string,
		name?: string,
		createdBy?: { id: string; username: string; avatar?: string },
		description?: string | null,
		tracks?: ServerPlaylistTrack[]
	) {
		super()
		if (guildId)
			this.guildId = guildId
		if (name)
			this.name = name
		if (createdBy)
			this.createdBy = createdBy
		if (description)
			this.description = description
		if (tracks)
			this.tracks = tracks
	}

}

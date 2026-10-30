// apps/bot/src/entities/GuildMusicConfig.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

import { CustomBaseEntity } from './BaseEntity'

@Entity()
export class GuildMusicConfig extends CustomBaseEntity {

	@PrimaryKey({ autoincrement: false, type: 'string' })
	guildId!: string

	@Property({ nullable: true, type: 'string' })
	djRoleId?: string | null = null

	@Property({ nullable: true, type: 'string' })
	playlistEditorRoleId?: string | null = null

	@Property({ type: 'boolean', default: false })
	allowPublicContributions: boolean = false

	@Property({ type: 'number', default: 100 })
	defaultVolume: number = 100

	@Property({ type: 'boolean', default: false })
	twentyFourSeven: boolean = false

	@Property({ nullable: true, type: 'string' })
	textChannelId?: string | null = null

	constructor(guildId?: string) {
		super()
		if (guildId)
			this.guildId = guildId
	}

}

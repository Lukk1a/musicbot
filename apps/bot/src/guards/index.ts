// apps/bot/src/guards/index.ts
import { CommandInteraction, GuildMember, PermissionResolvable } from 'discord.js'
import { GuardFunction, SimpleCommandMessage } from 'discordx'

export { Guard } from 'discordx'

/**
 * Clean UserPermissions guard checking interaction or message member permissions
 */
export function UserPermissions(permissions: PermissionResolvable[]): GuardFunction<CommandInteraction | SimpleCommandMessage> {
	return async (arg, _client, next) => {
		const interaction = arg instanceof CommandInteraction ? arg : null
		const message = arg instanceof SimpleCommandMessage ? arg.message : null
		const member = (interaction?.member ?? message?.member) as GuildMember | null

		if (!member) {
			return next()
		}

		const hasPerms = permissions.every((p) => member.permissions.has(p, true))
		if (hasPerms) {
			return next()
		}

		const deniedMsg = `You do not have the required permissions (${permissions.join(', ')}) to use this command.`
		if (interaction) {
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp({ content: deniedMsg, ephemeral: true })
			} else {
				await interaction.reply({ content: deniedMsg, ephemeral: true })
			}
		} else if (message) {
			await message.reply(deniedMsg)
		}
	}
}

/**
 * Basic in-memory RateLimit guard
 */
export function RateLimit(limit: number, duration: number): GuardFunction<CommandInteraction | SimpleCommandMessage> {
	const userTimestamps = new Map<string, number[]>()

	return async (arg, _client, next) => {
		const interaction = arg instanceof CommandInteraction ? arg : null
		const message = arg instanceof SimpleCommandMessage ? arg.message : null
		const userId = interaction?.user?.id ?? message?.author?.id

		if (!userId) {
			return next()
		}

		const now = Date.now()
		const timestamps = (userTimestamps.get(userId) || []).filter((t) => now - t < duration)

		if (timestamps.length >= limit) {
			const waitSec = Math.ceil((duration - (now - timestamps[0])) / 1000)
			const msg = `Rate limit exceeded. Please wait ${waitSec}s.`
			if (interaction) {
				if (interaction.deferred || interaction.replied) {
					await interaction.followUp({ content: msg, ephemeral: true })
				} else {
					await interaction.reply({ content: msg, ephemeral: true })
				}
			} else if (message) {
				await message.reply(msg)
			}
			return
		}

		timestamps.push(now)
		userTimestamps.set(userId, timestamps)
		return next()
	}
}

export * from './disabled'
export * from './guildOnly'
export * from './maintenance'
export * from './notBot'
export * from './nsfw'
export * from './match'
export * from './extractLocale'
export * from './requestContextIsolator'
export * from './InVoiceChannel'

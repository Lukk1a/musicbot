// apps/bot/src/client.ts
import { GatewayIntentBits, Partials } from 'discord.js'
import { Client, ClientOptions } from 'discordx'

import { generalConfig, logsConfig } from '@/configs'
import { env } from '@/env'
import { ExtractLocale, Maintenance, NotBot, RequestContextIsolator } from '@/guards'

export function clientConfig(): ClientOptions {
	return {
		// Scopes slash commands to test server in development
		botGuilds: env.NODE_ENV === 'development' ? [env.TEST_GUILD_ID] : undefined,

		// Required Discord Gateway Intents
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.GuildVoiceStates,
			GatewayIntentBits.GuildPresences,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.MessageContent,
		],

		partials: [
			Partials.Channel,
			Partials.Message,
			Partials.Reaction,
			Partials.GuildMember,
			Partials.User,
		],

		// Debug logs are disabled in silent mode
		silent: !logsConfig.debug,

		guards: [
			RequestContextIsolator,
			NotBot,
			Maintenance,
			ExtractLocale,
		],

		// Configuration for @SimpleCommand
		simpleCommand: {
			prefix: generalConfig.simpleCommandsPrefix,
		},
	}
}

export const client: Client = new Client(clientConfig())

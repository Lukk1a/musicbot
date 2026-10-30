import { Middleware } from '@tsed/common'
import { InternalServerError } from '@tsed/exceptions'
import { Client } from 'discordx'

import { resolveDependency } from '@/utils/functions'

@Middleware()
export class BotOnline {

	private client: Client | null = null

	constructor() {
		resolveDependency(Client).then((client) => {
			this.client = client
		}).catch(() => null)
	}

	async use() {
		if (!this.client) {
			try {
				this.client = await resolveDependency(Client)
			} catch {
				throw new InternalServerError('Discord client is not ready')
			}
		}

		if (this.client?.user?.presence?.status === 'offline')
			throw new InternalServerError('Bot is offline')
	}

}

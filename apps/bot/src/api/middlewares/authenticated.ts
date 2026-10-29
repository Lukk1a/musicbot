// apps/bot/src/api/middlewares/authenticated.ts
import { Context, Middleware, PlatformContext } from '@tsed/common'
import { BadRequest, Unauthorized } from '@tsed/exceptions'

import { env } from '@/env'

@Middleware()
export class Authenticated {

	use(@Context() { request }: PlatformContext) {
		const authHeader = request.headers.authorization
		if (!authHeader || !authHeader.startsWith('Bearer '))
			throw new BadRequest('Missing or malformed Authorization header.')

		const token = authHeader.split(' ')[1]
		if (!token)
			throw new BadRequest('Invalid bearer token format.')

		const adminToken = env.API_ADMIN_TOKEN
		if (!adminToken || token !== adminToken)
			throw new Unauthorized('Unauthorized: Invalid API admin token.')
	}

}

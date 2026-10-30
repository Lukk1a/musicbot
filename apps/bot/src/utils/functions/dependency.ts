import { F } from 'ts-toolbelt'
import { container, InjectionToken } from 'tsyringe'

export async function resolveDependency<T>(token: InjectionToken<T>, interval: number = 500): Promise<T> {
	if (typeof token === 'function') {
		try {
			if (container.isRegistered(token, true)) {
				return container.resolve(token)
			}
			// If not Client (which is dynamically registered after login), register as singleton and resolve
			if (token.name !== 'Client') {
				if (!container.isRegistered(token)) {
					container.registerSingleton(token as any)
				}
				return container.resolve(token)
			}
		} catch {
			// fall back to wait loop if instantiation failed
		}
	}

	let retries = 0
	while (!container.isRegistered(token, true)) {
		if (retries >= 30) {
			try {
				return container.resolve(token)
			} catch {
				throw new Error(`[resolveDependency] Timeout waiting for dependency: ${String((token as any)?.name || token)}`)
			}
		}
		retries++
		await new Promise(resolve => setTimeout(resolve, interval))
	}

	return container.resolve(token)
}

type Forward<T> = { [Key in keyof T]: T[Key] extends abstract new (...args: any) => any ? InstanceType<T[Key]> : T[Key] }

export async function resolveDependencies<T extends readonly [...unknown[]]>(tokens: F.Narrow<T>) {
	return Promise.all(tokens.map((token: any) =>
		resolveDependency(token)
	)) as Promise<Forward<F.Narrow<T>>>
}

// apps/bot/src/utils/decorators/Category.ts
export function Category(category: string): ClassDecorator & MethodDecorator {
	return function (target: any, key?: string | symbol, descriptor?: PropertyDescriptor) {
		if (target) {
			target.category = category
		}
	} as any
}

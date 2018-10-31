import { store } from '../router/store';

export function Before(reference: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.preMiddleware.unshift(reference);
  };
}

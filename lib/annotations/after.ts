import { store } from '../router/store';

export function After(reference: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.postMiddleware.unshift(reference);
  };
}

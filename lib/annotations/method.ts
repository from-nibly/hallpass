import { httpMethod, store } from '../router/store';

export function Method(method: httpMethod) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.methods.push(method);
  };
}

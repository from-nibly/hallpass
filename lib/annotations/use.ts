import { store } from '../router/store';

export function Use() {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.methods.push('use');
  };
}

import { store } from '../router/store';

export function Path(path: string | RegExp) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.path = path;
  };
}

import { store } from './../router/store';

export function Wrap(reference: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.wrappers.push(reference);
  };
}

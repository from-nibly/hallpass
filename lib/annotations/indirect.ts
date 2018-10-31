import { store } from '../router/store';

export function Indirect() {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.indirect = true;
  };
}

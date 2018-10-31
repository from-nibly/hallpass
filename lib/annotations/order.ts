import { store } from '../router/store';

export function Order(order: number) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.order = order;
  };
}

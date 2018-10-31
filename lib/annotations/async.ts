import { store } from './../router/store';
export function Async() {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.async = true;
  };
}

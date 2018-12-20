import { store } from './../router/store';
export function Error() {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let route = store.getRoute(target.constructor, propertyKey);
    route.error = true;
  };
}

import { store } from './../router/store';

export function AfterRouter(reference: string) {
  return function(ctor: Function) {
    let router = store.getRouter(ctor);
    router.postMiddleware.unshift(reference);
  };
}

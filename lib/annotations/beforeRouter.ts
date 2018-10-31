import { store } from '../router/store';

export function BeforeRouter(reference: string) {
  return function(ctor: Function) {
    let router = store.getRouter(ctor);
    router.preMiddleware.unshift(reference);
  };
}

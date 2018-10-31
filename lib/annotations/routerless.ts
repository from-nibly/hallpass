import { store } from '../router/store';

export function Routerless() {
  return function(ctor: Function) {
    let router = store.getRouter(ctor);
    router.routerless = true;
  };
}

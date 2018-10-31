import { store } from '../router/store';

export function RouterPath(path: string | RegExp) {
  return function(ctor: Function) {
    let router = store.getRouter(ctor);
    router.routerPath = path;
  };
}

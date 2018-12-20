import { store } from './../router/store';

export function WrapRouter(reference: string) {
  return function(ctor: Function) {
    let router = store.getRouter(ctor);
    router.wrappers.push(reference);
  };
}

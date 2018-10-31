export type httpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';

export class ClassRouteStore {
  routers: { [className: string]: RouterConfig } = {};
}

export class RouterConfig {
  routerPath: string | RegExp;
  routes: { [methodName: string]: RouteConfig } = {};
  preMiddleware: string[] = [];
  postMiddleware: string[] = [];
  routerless: boolean = false;
}

export class RouteConfig {
  path: string | RegExp;
  methods: (httpMethod | 'use')[] = [];
  order: number | undefined;
  indirect: boolean = false;
  preMiddleware: string[] = [];
  postMiddleware: string[] = [];
  wrappers: string[] = [];
  async: boolean = false;
  error: boolean = false;
}

export class Store {
  private routeConfig: ClassRouteStore;
  constructor() {
    this.routeConfig = new ClassRouteStore();
  }

  getRouter(ctor: Function | string): RouterConfig {
    let className: string;
    if (typeof ctor === 'string') {
      className = ctor;
    } else {
      className = ctor.name;
    }

    this.routeConfig.routers[className] = this.routeConfig.routers[className] || new RouterConfig();

    return this.routeConfig.routers[className];
  }

  getRoute(target: any, propertyKey: string): RouteConfig {
    let router = this.getRouter(target);

    router.routes[propertyKey] = router.routes[propertyKey] || new RouteConfig();

    return router.routes[propertyKey];
  }
}

export const store = new Store();

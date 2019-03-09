import * as express from 'express';
import { NextFunction, Request, Response } from 'express';
import { RouteConfig, store, RouterConfig } from './router/store';

export interface Logger {
  info: (...args: any[]) => void;
}

export interface HasConstructor {
  constructor: {
    name: string;
  };
}

export class HandlerContext {
  instance: any;
  method: Function;
  cfg: RouteConfig;
}

export interface RouterOverrides {
  path?: string;
  preMiddleware?: string[];
  postMiddleware?: string[];
  wrappers?: string[];
  routerless?: boolean;
}

export class ClassRouter {
  private instances: { [ctorName: string]: any } = {};
  private logger: Logger;

  constructor(public server: express.Application, logger?: Logger) {
    this.logger = logger || {
      info: (...args: any[]) => {},
    };
  }

  registerRouteHandler<T extends HasConstructor>(routeHandler: T, overrides?: RouterOverrides) {
    this.instances[routeHandler.constructor.name] = routeHandler;
    let route = store.getRouter(routeHandler.constructor.name);
    Object.assign(route, overrides);
  }

  initializeRoutes() {
    for (let routerName in this.instances) {
      let routeHandler = this.instances[routerName];
      let routerCfg = store.getRouter(routeHandler.constructor);
      let router: any;
      if (routerCfg.routerless) {
        router = this.server;
      } else {
        router = express.Router();
      }

      //order routes
      let routeNames = Object.keys(routerCfg.routes);
      routeNames.sort((a, b) => {
        return (routerCfg.routes[a].order || 0) - (routerCfg.routes[b].order || 0);
      });

      for (let routeName of routeNames) {
        let routeCfg = routerCfg.routes[routeName];

        let wrappedLogString = routeCfg.wrappers.reduce((p, wrapper) => {
          return wrapper + '(' + p + ')';
        }, routeName);
        let routerPathLogString = routerCfg.path ? '(' + routerCfg.path + ')' : '';
        let routePathLogString = routeCfg.path ? '(' + routeCfg.path + ')' : '';
        this.logger.info(
          `Adding route ${routerName}${routerPathLogString}.${routeName}${routePathLogString}[${routeCfg.methods.join(
            ', '
          )}]: ${[...routerCfg.preMiddleware, ...routeCfg.preMiddleware].join(
            '->'
          )}{${wrappedLogString}}${[...routerCfg.postMiddleware, ...routeCfg.postMiddleware].join(
            '->'
          )}`
        );

        let routeAddress = `${routerName}.${routeName}`;
        let middlewares = this.createMiddlewareFunctions(routeAddress, []);

        for (let method of routeCfg.methods) {
          if (routeCfg.path) {
            router[method](routeCfg.path, middlewares);
          } else {
            router[method](middlewares);
          }
        }
      }

      if (!routerCfg.routerless) {
        this.logger.info(
          `Binding router ${routerName}${
            routerCfg.path ? '(' + routerCfg.path + ')' : ''
          } with routes [${routeNames.join(', ')}]`
        );
        if (routerCfg.path) {
          this.server.use(routerCfg.path, router);
        } else {
          this.server.use(router);
        }
      }
    }
  }

  private createMiddlewareFunctions(address: string, path: string[]): Function[] {
    if (path.indexOf(address) !== -1) {
      throw new Error('Cycle found dependency path was ' + path.join(' -> '));
    }
    let { instance, method, cfg } = this.resolveAddress(address);
    //resolve indirection
    if (cfg.indirect) {
      method = method.bind(instance)();
    }
    //bind to instance
    method = method.bind(instance);
    //wrap in async
    if (cfg.async) {
      method = this.wrapInAsync(method, cfg.error);
    }
    let routerCfg = store.getRouter(instance.constructor);

    //wrap with custom wrappers
    let wrappers = cfg.wrappers.map(address => this.resolveAddress(address));
    for (let wrapper of wrappers) {
      //bind wrapper
      let wrapperConstructor = wrapper.method.bind(wrapper.instance);
      method = wrapperConstructor(method, cfg);
    }
    let routerWrappers = routerCfg.wrappers.map(address => this.resolveAddress(address));
    for (let wrapper of routerWrappers) {
      let wrapperConstructor = wrapper.method.bind(wrapper.instance);
      method = wrapperConstructor(method, cfg);
    }
    //get pre and post route middleware
    let preMiddleware: Function[] = [];
    preMiddleware = preMiddleware.concat(
      ...cfg.preMiddleware.map(addr => this.createMiddlewareFunctions(addr, [address]))
    );
    let postMiddleware: Function[] = [];
    postMiddleware = postMiddleware.concat(
      ...cfg.postMiddleware.map(addr => this.createMiddlewareFunctions(addr, [address]))
    );

    //get pre and post router middleware
    let routerPreMiddleware: Function[] = [];
    routerPreMiddleware = routerPreMiddleware.concat(
      ...routerCfg.preMiddleware.map(addr => this.createMiddlewareFunctions(addr, [address]))
    );
    let routerPostMiddleware: Function[] = [];
    routerPostMiddleware = routerPostMiddleware.concat(
      ...routerCfg.postMiddleware.map(addr => this.createMiddlewareFunctions(addr, [address]))
    );

    return [
      ...routerPreMiddleware,
      ...preMiddleware,
      method,
      ...postMiddleware,
      ...routerPostMiddleware,
    ];
  }

  private resolveAddress(address: string): HandlerContext {
    let className = address.split('.')[0];
    let methodName = address.split('.')[1];
    //get config
    let cfg = store.getRoute(className, methodName);
    //get instance and method
    let instance = this.instances[className];
    let method = instance[methodName];
    return {
      instance: instance,
      method: method,
      cfg: cfg,
    };
  }

  private wrapInAsync(method: Function, error: boolean) {
    if (error) {
      return (err: any, req: Request, res: Response, next: NextFunction) => {
        method(err, req, res, next)
          .then(() => {
            if (!res.headersSent) {
              next();
            }
          })
          .catch((e: any) => {
            if (!res.headersSent) {
              next(e);
            }
          });
      };
    } else {
      return (req: Request, res: Response, next: NextFunction) => {
        method(req, res, next)
          .then(() => {
            if (!res.headersSent) {
              next();
            }
          })
          .catch((e: any) => {
            if (!res.headersSent) {
              next(e);
            }
          });
      };
    }
  }
}

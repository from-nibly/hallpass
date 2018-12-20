import * as express from 'express';
import { NextFunction, Request, Response } from 'express';
import { RouteConfig, store } from './router/store';

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

export class ClassRouter {
  private instances: { [ctorName: string]: any } = {};
  private logger: Logger;

  constructor(public server: express.Application, logger?: Logger) {
    this.logger = logger || {
      info: (...args: any[]) => {},
    };
  }

  registerRouteHandler<T extends HasConstructor>(routeHandler: T) {
    this.instances[routeHandler.constructor.name] = routeHandler;
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
        this.logger.info(
          'adding route',
          routeCfg.preMiddleware,
          routerName,
          routeName,
          routeCfg.methods,
          routeCfg.path,
          routeCfg.postMiddleware,
          ''
        );

        let routeAddress = `${routerName}.${routeName}`;
        this.logger.info('resolved address', routeAddress);
        let middlewares = this.createMiddlewareFunctions(routeAddress, []);

        this.logger.info(
          'checking middleware',
          routerName,
          routeName,
          middlewares.map(m => m.name),
          ''
        );

        for (let method of routeCfg.methods) {
          if (routeCfg.path) {
            router[method](routeCfg.path, middlewares);
          } else {
            router[method](middlewares);
          }
        }
      }

      if (!routerCfg.routerless) {
        if (routerCfg.routerPath) {
          this.logger.info('binding router', routerName, 'to path', routerCfg.routerPath);
          this.server.use(routerCfg.routerPath, router);
        } else {
          this.logger.info('binding router', routerName, 'pathless');
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
      this.logger.info('wrapping in async', address);
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

# hallpass

hallpass is a class based express router wiring for nodejs written in typescript.

## Getting Started

First lets show a very simple example of a class with a get request.

```typescript
import { Method, Path } from '@fromnibly/hallpass';
export class HelloWorldHandler {
  @Method('get')
  @Path('/hello')
  handleGetHello(req: Request, res: Response): void {
    req.status(202).send('Hello World');
  }
}
```

The equivilent of this using bare express would be

```typescript
import * as express from 'express';
export function initApp(app: express.Application) {
  app.get('/hello', (req: Request, res: Response) => {
    req.status(200).send('Hello World');
  });
}
```

### wiring it up

Once you have created all of your classes you will need to wire them up to your router.

```typescript
import * as express from 'express';

let server = express();

let classRouter = new ClassRouter(server);

classRouter.registerRouteHandler(new HelloWorldHandler());

classRouter.initializeRoutes();

server.listen(8080, () => {
  console.log('server started on port 8080');
});
```

One important thing to note is that the registerRouteHandler function takes an instantiated class. This means that the construction can be left up to something else like a dependency injection framework like `inversify`. The only requirement of a given class is that it has a constructor with a name.

more in depth information in the [wiki](https://github.com/from-nibly/hallpass/wiki)

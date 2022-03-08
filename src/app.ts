import express from 'express';
import * as bodyParser from 'body-parser';
import cors from 'cors';
import { requireJwtMiddleware } from './middlewares/auth.middleware';
import errorMiddleware from './middlewares/error.middleware';
 
class App {
  public app: express.Application;
  public port: number;
 
  constructor(controllers : any[], port : number) {
    this.app = express();
    this.port = port;
 
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
    this.intializeErrorHandlers();
  }
 
  private initializeMiddlewares() {
    this.app.use(bodyParser.json({ limit : '50mb'}));
    this.app.use(bodyParser.urlencoded({
      extended: true
    }));
    // TODO : add this before publishing
    this.app.use(requireJwtMiddleware);
    this.app.use(cors());
  }

  private initializeControllers(controllers : any[]) {
      controllers.forEach((controller) => {
          this.app.use('/', controller.router);
      });
  }

  private intializeErrorHandlers(){
      this.app.use(errorMiddleware);
  }

  public listen() {
      this.app.listen(this.port, () => {
          console.log(`App listening on the port ${this.port}`);
      });
  }
}

export default App;

import cors from 'cors';
import express, { Application } from 'express';
import Controller from './models/interface/controllers.interface';

export default class App {
  public app: express.Application;

  constructor(controllers: Controller[]) {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
  }

  public listen(): void {
    this.app.listen(
      Number(process.env.PORT!),
      String(process.env.HOST!),
      () => {
        console.log(
          `Server listening on the port: http://${process.env.HOST}:${process.env.PORT}`
        );
      }
    );
  }

  public getServer(): Application {
    return this.app;
  }

  private initializeMiddlewares(): void {
    this.app.use('/media', express.static('src/media'));
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(express.json());
    this.app.use(cors());
  }

  private initializeControllers(controllers: Controller[]) {
    controllers.map((controller: Controller) => {
      this.app.use('/tu-sport', controller.router);
    });
  }
}

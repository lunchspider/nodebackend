import 'dotenv/config';
import App from './app';
import { createConnection } from 'typeorm';
import { UserController } from './controllers/user.controller';
import { GameController } from './controllers/game.controller';
const ormconfig = require('../ormconfig.json');

let port = Number(process.env.PORT) || 5000;


const main = async () => {
    await createConnection(ormconfig);
    const app = new App(
        [
            new UserController(),
            new GameController(),
        ]
        , port
    );
    app.listen();
}

main();

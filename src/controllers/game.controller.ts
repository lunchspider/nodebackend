import { Request, Response, NextFunction } from "express";
import * as express from "express";
import HttpException from "../exceptions/HttpException";
import { getRepository } from "typeorm";
import { Game } from "../entities/game.entity";
import { Session } from "../entities/session.entity";
import { User } from "../entities/user.entity";
import * as cron from "node-cron";

export class GameController {
    public path = "/games";
    public router = express.Router();
    public gameRepository = getRepository(Game);
    public userRepository = getRepository(User);
    constructor() {
        this.intializeRoutes();
    }

    public intializeRoutes() {
        this.router.get(`${this.path}`, this.getGames);
        this.router.post(`${this.path}`, this.createGame);
        this.router.post(`${this.path}/:id`, this.enterGame);
        this.router.get(`${this.path}/:id`, this.getGame);
        this.router.get(`${this.path}/:id/confirm`, this.confirmGame);
        this.router.post(`${this.path}/:id/kick`, this.kickUser);
        this.router.get(`${this.path}/:id/leave`, this.leaveGame);
        this.router.post(`${this.path}/:id/vote`, this.votePlayer);
    }

    getGames = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let confirmed: boolean | null = req.body.confirmed;
            let query = {};
            if (confirmed) {
                query = {
                    where: { is_confirmed: true },
                };
            }
            let games = await this.gameRepository.find(query);
            return res.json(games);
        } catch (e) {
            return next(new HttpException(400, "Error in getting games!"));
        }
    };
    createGame = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let session: Session = res.locals.session;
            let user = await this.userRepository.findOne(session.id);
            let from_time: number = req.body.from_time;
            let to_time: number = req.body.to_time;
            console.log(from_time);
            console.log(to_time);
            let newGame = new Game();
            newGame.from_time = new Date(from_time);
            newGame.to_time = new Date(to_time);
            newGame.confirmed_time = new Date(to_time);
            newGame.num_players = 1;
            newGame.num_ready = 0;
            if (user) {
                //newGame.players.push(user);
                newGame.players = [user];
                // since we can have atmost 4 players
                newGame.votes = [0, 0, 0, 0];
                let doc = await this.gameRepository.save(newGame);
                res.json(doc);
            } else {
                return next(
                    new HttpException(400, "Error in finding that user!")
                );
            }
        } catch (e) {
            console.log(e);
            return next(new HttpException(400, "Error in creating games!"));
        }
    };
    enterGame = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let session: Session = res.locals.session;
            let gameId: string = req.params.id;
            let game = await this.gameRepository.findOne(gameId, {
                relations: ["players"],
            });
            let user = await this.userRepository.findOne(session.id);
            console.log(session.id);
            console.log("User is : ", user);
            if (!game || !user) {
                return next(new HttpException(404, "Cannot find game!"));
            }
            if (game.num_players >= 4) {
                return next(new HttpException(400, "Game already full!"));
            }
            game.num_players += 1;
            game.players.push(user);
            let doc = await this.gameRepository.save(game);
            res.json(doc);
        } catch (e) {
            console.log(e);
            return next(new HttpException(400, "Error in entering game!"));
        }
    };
    confirmGame = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let session: Session = res.locals.session;
            let gameId: string = req.params.id;
            let game = await this.gameRepository.findOne(gameId, {
                relations: ["players"],
            });
            if (!game) {
                return next(new HttpException(404, "Game doesn't exist!"));
            }
            let found = false;
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].id === session.id) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return next(
                    new HttpException(400, "You are not in this game!")
                );
            }
            if (game.is_confirmed) {
                return next(
                    new HttpException(400, "Game is already confirmed!")
                );
            }
            game.num_ready += 1;
            if (game.num_ready === game.num_players) {
                // everyone is ready let's go!
                game.is_confirmed = true;
                game.confirmed_time = new Date();
                // our end time is this
                let endTime = new Date(game.confirmed_time.getTime() + 3600 * 1000);
                cron.schedule(endTime.toString(), () =>
                    this.jobRunner(gameId).then((res) => console.log(res))
                );
            }
            await this.gameRepository.save(game);
            res.status(200).json(game);
        } catch (e) {
            return next(new HttpException(400, "Error in confirming game!"));
        }
    };
    leaveGame = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let gameId: string = req.params.id;
            let session: Session = res.locals.session;
            let game = await this.gameRepository.findOne(gameId, {
                relations: ["players"],
            });
            if (!game) {
                return next(new HttpException(404, "Game not found!"));
            }
            let found = false;
            for (let i = 0; i < game.num_players; i++) {
                if (game.players[i].id === session.id) {
                    found = true;
                    game.players.splice(i, i);
                    game.num_players -= 1;
                    game.num_ready -= 1;
                    game.is_confirmed = false;
                }
            }
            if (!found) {
                return next(new HttpException(404, "Player not found!"));
            }
            this.gameRepository.save(game);
        } catch (e) {
            console.log(e);
            return next(new HttpException(400, "Cannot leave game!"));
        }
    };
    getGame = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let gameId: string = req.params.id;
            console.log("game id is : ", gameId);
            let game = await this.gameRepository.findOne(gameId, {
                relations: ["players"],
            });
            if (!game) {
                return next(new HttpException(404, "Game doesn't exist!"));
            }
            res.json(game);
        } catch (e) {
            console.log(e);
            return next(new HttpException(400, "Cannot get game!"));
        }
    };
    kickUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let userId: string = req.body.id;
            let gameId: string = req.params.id;
            const session: Session = res.locals.session;
            let game = await this.gameRepository.findOne(gameId, {
                relations: ["players"],
            });
            if (!game) {
                return next(new HttpException(404, "Game doesn't exist!"));
            }
            if (session.id != game.players[0].id) {
                // since the player at index 0 is host
                return next(
                    new HttpException(401, "You are not the host of the game!")
                );
            }
            let found = false;
            for (let i = 0; i < game.num_players; i++) {
                if (game.players[i].id === userId) {
                    found = true;
                    game.players.splice(i, i);
                    game.num_players -= 1;
                    game.num_ready -= 1;
                    game.is_confirmed = false;
                }
            }
            if (!found) {
                return next(new HttpException(404, "Player not found!"));
            }
            this.gameRepository.save(game);
        } catch (e) {
            console.log(e);
            return next(new HttpException(400, "Cannot kick user"));
        }
    };
    votePlayer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session: Session = res.locals.session;
            let gameId: string = req.params.id;
            let toVoteId: string = req.body.id;
            let game = await this.gameRepository.findOne(gameId, {
                relations: ["players"],
            });
            if (!game) {
                return next(new HttpException(404, "Game not found!!"));
            }
            if (!game.is_confirmed) {
                return next(
                    new HttpException(401, "Game is not confirmed yet!")
                );
            }
            let isUserInGame = false;
            let playerFound = false;
            let playerNumber = 0;
            for (let i = 0; i < game.num_players; i++) {
                if (game.players[i].id === session.id) {
                    // player is in the game so he can vote!!
                    isUserInGame = true;
                }
                if (game.players[i].id === toVoteId) {
                    playerFound = true;
                    playerNumber = i;
                }
            }
            if (!isUserInGame) {
                return next(
                    new HttpException(401, "Your are not in this game!!")
                );
            }
            if (!playerFound) {
                return next(new HttpException(404, "Player not found!"));
            }
            game.votes[playerNumber] += 1;
            this.gameRepository.save(game);
            for (let i = 0; i < game.num_players; i++) {
                if (game.votes[i] >= 3) {
                    // we found the winner
                    game.winner = game.players[i];
                    game.is_dispute = false;
                }
            }
            res.status(200).send(game);
        } catch (e) {
            console.log(e);
            return next(new HttpException(400, "Some error has occured!"));
        }
    };

    jobRunner = async (id: string) => {
        try {
            let game = await this.gameRepository.findOne(id);
            if (!game) {
                throw Error("game not found!");
            }
            if (game.is_dispute || game.is_confirmed) {
                //kick everyone
                game.is_confirmed = false;
                game.is_dispute = true;
                game.players = [];
                await this.gameRepository.save(game);
            }
        } catch (e) {
            console.log(e);
        }
    };
}

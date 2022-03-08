import { Request, Response, NextFunction} from 'express';
import * as express from 'express';
import HttpException from '../exceptions/HttpException';
import {getRepository} from 'typeorm';
import {User} from '../entities/user.entity';
import {encodeSession} from '../utility/sessionManagement';

export class UserController{
    public path = "/users";
    public router = express.Router();
    public userRepository = getRepository(User);
    constructor(){
        this.intializeRoutes();
    }
    public intializeRoutes() {
        this.router.get(`${this.path}`, this.getUsers);
        this.router.post(`${this.path}/login`, this.loginUser);
    }
    getUsers = async (req : Request, res : Response, next : NextFunction) => {
        try{
            let users = await this.userRepository.find();
            return res.json(users);
        } catch(e : any){
            return next(new HttpException(400, "Error in getting users!"));
        }
    }
    loginUser = async(req: Request, res: Response, next: NextFunction) =>{
        try{
            let isUser = await this.userRepository.findOne({
                where : {
                    username: req.body.username,
                }
            });
            if(isUser){
                const session = encodeSession("SECRET_KEY_HERE", {
                    id: isUser.id,
                    username: isUser.id,
                    dateCreated: +new Date
                });
                res.setHeader('X-JWT-TOKEN', session.token);
                return res.status(200).json(session);
            }
            let user = new User();
            user.username = req.body.username;
            let doc = await this.userRepository.save(user);
            const session = encodeSession("SECRET_KEY_HERE", {
                id : doc.id,
                username : doc.username,
                dateCreated : +new Date
            });
            res.setHeader('X-JWT-TOKEN', session.token);
            res.status(200).json(session);
        } catch(e : any){
            return next(new HttpException(400, "Error in login User"));
        }
    }
}


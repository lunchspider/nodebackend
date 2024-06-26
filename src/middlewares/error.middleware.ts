import { NextFunction, Request, Response } from 'express';
import HttpException from '../exceptions/HttpException';
 
function errorMiddleware(error: HttpException, request: Request, response: Response, next: NextFunction) {
  const status = error.status || 500;
  const ok = error.ok || false;
  const message = error.message || 'Something went wrong';
  response
    .status(status)
    .send({
        ok,
        message,
    })
}
 
export default errorMiddleware;




class HttpException extends Error {
  status: number;
  message: string;
  ok: boolean;
  constructor(status: number, message: string, ok? : boolean) {
    super(message);
    this.status = status;
    this.message = message;
    this.ok = ok || false;
  }
}
 
export default HttpException;

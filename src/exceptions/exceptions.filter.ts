import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { ValidationException, BlockedAccountException, InvalidAccountException, Exception } from "./exceptions";
import { Response } from 'express';

@Catch(Exception)
export class ExeptionsFilter implements ExceptionFilter {
    catch(exception: Exception, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response: Response = ctx.getResponse();

        switch (exception.type) {
            case BlockedAccountException:
                response.status(403)
                    .json({
                        status: 403,
                        message: [exception.message],
                        error: 'Forbidden'
                    });
                break;
            default:
                response.status(400)
                    .json({
                        status: 400,
                        message: [exception.message],
                        error: 'Bad Request'
                    });
        }

        response;
    }
}
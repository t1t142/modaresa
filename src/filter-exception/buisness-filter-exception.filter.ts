import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { BuisnessError } from './buisness-error';

@Catch(BuisnessError)
export class LogicExceptionFilter extends BaseExceptionFilter {
  catch(exception: BuisnessError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message.replace(/\n/g, '');
    const status = HttpStatus.UNPROCESSABLE_ENTITY;
    response.status(status).json({
      statusCode: status,
      message: message,
    });
  }
}

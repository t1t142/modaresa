import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Type } from '../enum/type.enum';

export class CreateAppointmentDto {
  @IsNotEmpty()
  declare title: string;
  @IsInt()
  declare hostId: number;
  @IsInt()
  declare buyerId: number;
  @IsEnum(Type)
  declare type: Type;

  @ValidateIf((c) => c.type === Type.PHYSICAL)
  @IsNotEmpty()
  declare location?: string;
  @ValidateIf((c) => c.type === Type.VIRTUAL)
  @IsNotEmpty()
  declare link?: string;
  @IsDateString()
  declare startTime: string;
  @IsDateString()
  declare endTime: string;
}

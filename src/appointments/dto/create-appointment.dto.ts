import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, ValidateIf } from 'class-validator';
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
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : null))
  declare startTime: Date;
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : null))
  declare endTime: Date;
}

import { Transform } from 'class-transformer';
import { IsDate } from 'class-validator';

export class FindByDayParameterDto {
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : null))
  day: Date;
}

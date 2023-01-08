import { IsDateString } from 'class-validator';

export class FindByDayParameterDto {
  @IsDateString()
  day: string;
}

import { Module } from '@nestjs/common';
import { AppointmentService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PrismaModule } from '../prisma-module/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppointmentsController],
  providers: [AppointmentService],
})
export class AppointmentModule {}

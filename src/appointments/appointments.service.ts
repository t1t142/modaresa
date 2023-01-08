import { Injectable } from '@nestjs/common';
import { BuisnessError } from '../filter-exception/buisness-error';
import { PrismaService } from '../prisma-module/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(private prisma: PrismaService) {}
  async create(createAppointmentDto: CreateAppointmentDto) {
    await this.areVendorAndBuyerExist(createAppointmentDto);
    await this.FindExistingAppointmentwWithOverlaps(createAppointmentDto);
    return this.persistAppointment(createAppointmentDto);
  }

  findAllByDay(date: Date) {
    date.setHours(0, 0, 0);
    const start = new Date(date);
    date.setHours(23, 59, 59);
    const end = new Date(date);
    return this.prisma.appointment.findMany({
      where: { startTime: { gte: start, lte: end } },
    });
  }

  async update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    const appointment = await this.prisma.appointment.findFirstOrThrow({
      where: { id },
    });
    delete appointment.id;
    if (updateAppointmentDto.startTime || updateAppointmentDto.endTime) {
      const appointmentWithNewSchedule: CreateAppointmentDto = {
        ...appointment,
        startTime: updateAppointmentDto.startTime
          ? updateAppointmentDto.startTime
          : appointment.startTime,
        endTime: updateAppointmentDto.endTime
          ? updateAppointmentDto.endTime
          : appointment.endTime,
      } as CreateAppointmentDto;
      await this.FindExistingAppointmentwWithOverlaps(
        appointmentWithNewSchedule,
      );
    }
    if (updateAppointmentDto.buyerId) {
      await this.isBuyerExist;
    }
    if (updateAppointmentDto.hostId) {
      await this.isVendorExist;
    }
    return await this.prisma.appointment.update({
      where: { id },
      data: updateAppointmentDto,
    });
  }

  async remove(id: number) {
    await this.prisma.appointment.findFirstOrThrow({ where: { id } });
    return this.prisma.appointment.delete({ where: { id } });
  }
  private persistAppointment(createAppointmentDto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: createAppointmentDto,
    });
  }

  private async FindExistingAppointmentwWithOverlaps(
    createAppointmentDto: CreateAppointmentDto,
  ) {
    const existingAppointmentwWithOverlaps =
      await this.prisma.appointment.findMany({
        where: {
          AND: [
            {
              OR: [
                { hostId: createAppointmentDto.hostId },
                { buyerId: createAppointmentDto.buyerId },
              ],
            },
            {
              OR: [
                {
                  startTime: {
                    lte: createAppointmentDto.endTime,
                    gte: createAppointmentDto.startTime,
                  },
                },
                {
                  endTime: {
                    lte: createAppointmentDto.endTime,
                    gte: createAppointmentDto.startTime,
                  },
                },
              ],
            },
          ],
        },
      });
    if (existingAppointmentwWithOverlaps.length) {
      if (
        existingAppointmentwWithOverlaps[0].buyerId ===
        createAppointmentDto.buyerId
      ) {
        throw new BuisnessError('Buyer have already an appointment');
      }
      throw new BuisnessError('Vendor have already an appointment');
    }
  }

  private async areVendorAndBuyerExist(
    createAppointmentDto: CreateAppointmentDto,
  ) {
    await this.isBuyerExist(createAppointmentDto);
    await this.isVendorExist(createAppointmentDto);
  }

  private async isVendorExist(createAppointmentDto: CreateAppointmentDto) {
    await this.prisma.vendor.findUniqueOrThrow({
      where: { id: createAppointmentDto.hostId },
    });
  }

  private async isBuyerExist(createAppointmentDto: CreateAppointmentDto) {
    await this.prisma.buyer.findUniqueOrThrow({
      where: { id: createAppointmentDto.buyerId },
    });
  }
}

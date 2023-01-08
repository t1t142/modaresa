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

  private persistAppointment(createAppointmentDto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: {
        ...createAppointmentDto,
        startTime: new Date(createAppointmentDto.startTime),
        endTime: new Date(createAppointmentDto.endTime),
      },
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
                    lte: new Date(createAppointmentDto.endTime),
                    gte: new Date(createAppointmentDto.endTime),
                  },
                },
                {
                  endTime: {
                    lte: new Date(createAppointmentDto.endTime),
                    gte: new Date(createAppointmentDto.endTime),
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
      if (
        existingAppointmentwWithOverlaps[0].hostId ===
        createAppointmentDto.hostId
      ) {
        throw new BuisnessError('Vendor have already an appointment');
      }
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

  findAllByDay(day: string) {
    const date = new Date(day);
    date.setHours(0, 0, 0);
    const start = new Date(date);
    date.setHours(23, 59, 59);
    const end = new Date(date);
    return this.prisma.appointment.findMany({
      where: { startTime: { gte: start, lte: end } },
    });
  }

  update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    return `This action updates a #${id} appointment`;
  }

  remove(id: number) {
    return `This action removes a #${id} appointment`;
  }
}

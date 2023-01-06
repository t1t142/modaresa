/* eslint-disable prettier/prettier */
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppointmentModule } from '../src/appointments/appointments.module';
import * as request from 'supertest';
import { CreateAppointmentDto } from '../src/appointments/dto/create-appointment.dto';
import { Type } from '../src/appointments/enum/type.enum';
import { PrismaClientExceptionFilter } from '../src/filter-exception/prima-filter-client-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaService } from '../src/prisma-module/prisma.service';
import { Buyer, Vendor } from '@prisma/client';
import { LogicExceptionFilter } from '../src/filter-exception/buisness-filter-exception.filter';

describe('AppointmentsEndPoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let existingVendor: Vendor;
  let existingBuyer: Buyer;
  let existingVendorWithAppointment: Vendor;
  let existingBuyerWithAppointment: Buyer;
  let existingVendorWithAppointmentNotInRange: Vendor;

  const expectedStartTime = '2023-01-06T16:50z';
  const expectedEndTime = '2023-01-06T17:50z';
  const expectedStartTimeOutOfRange = '2023-01-06T14:50z';
  const expectedEndTimeOutOfRange = '2023-01-06T15:50z';
  const appointmentUrl = '/appointments';
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppointmentModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(
      new PrismaClientExceptionFilter(httpAdapter),
      new LogicExceptionFilter(httpAdapter),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);
    existingBuyer = await prisma.buyer.create({
      data: { name: 'Dupont', company: { create: { name: 'Les Halles' } } },
    });
    existingVendor = await prisma.vendor.create({
      data: { name: 'Durant' },
    });
    await prisma.vendor.create({
      data: {
        name: 'Menier',

        appointments: {
          create: [
            {
              endTime: new Date(expectedEndTime),
              startTime: new Date(expectedStartTime),
              title: 'test4',
              type: Type.VIRTUAL,
              link: 'mylink3',
              client: {
                create: {
                  name: 'Voltaire',
                  companyId: existingBuyer.companyId,
                },
              },
            },
          ],
        },
      },
    });
    existingBuyerWithAppointment = await prisma.buyer.create({
      data: {
        name: 'Deschamps',
        company: { create: { name: 'Les Halles' } },
        appointments: {
          create: [
            {
              endTime: new Date(expectedEndTime),
              startTime: new Date(expectedStartTime),
              title: 'test',
              type: Type.PHYSICAL,
              location: 'Paris',
              host: {
                create: {
                  name: 'gucci',
                },
              },
            },
          ],
        },
      },
    });
    existingVendorWithAppointment = await prisma.vendor.create({
      data: {
        name: 'Dupuis',

        appointments: {
          create: [
            {
              endTime: new Date(expectedEndTime),
              startTime: new Date(expectedStartTime),
              title: 'test',
              type: Type.VIRTUAL,
              link: 'mylink',
              client: {
                create: {
                  name: 'gucci',
                  companyId: existingBuyer.companyId,
                },
              },
            },
          ],
        },
      },
    });
    existingVendorWithAppointmentNotInRange = await prisma.vendor.create({
      data: {
        name: 'Duranton',

        appointments: {
          create: [
            {
              endTime: new Date(expectedEndTimeOutOfRange),
              startTime: new Date(expectedStartTimeOutOfRange),
              title: 'test2',
              type: Type.VIRTUAL,
              link: 'mylink2',
              client: {
                create: {
                  name: 'la Fayette',
                  companyId: existingBuyer.companyId,
                },
              },
            },
          ],
        },
      },
    });
  });

  describe('appointment creation', () => {
    it('should not create appointment with missing data', () => {
      return request(app.getHttpServer())
        .post(appointmentUrl)

        .send({})
        .expect((res: request.Response) => {
          const { message } = res.body;

          expect(message).toEqual([
            'title should not be empty',
            'hostId must be an integer number',
            'buyerId must be an integer number',
            'type must be a valid enum value',
            'startTime must be a valid ISO 8601 date string',
            'endTime must be a valid ISO 8601 date string',
          ]);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
    it('should not create an appointment with not existent buyer', () => {
      const body: CreateAppointmentDto = {
        buyerId: -1,
        endTime: expectedEndTime,
        hostId: -1,
        type: Type.PHYSICAL,
        location: 'Paris',
        startTime: expectedStartTime,
        title: 'Fashion week',
      };

      return request(app.getHttpServer())
        .post(appointmentUrl)

        .send(body)
        .expect((res: request.Response) => {
          const { message } = res.body;

          expect(message).toEqual('No Buyer found');
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });
    it('should not create an appointment with not existent vendor', () => {
      const body: CreateAppointmentDto = {
        buyerId: existingBuyer.id,
        endTime: expectedEndTime,
        hostId: -1,
        type: Type.PHYSICAL,
        location: 'Paris',
        startTime: expectedStartTime,
        title: 'Fashion week',
      };

      return request(app.getHttpServer())
        .post(appointmentUrl)

        .send(body)
        .expect((res: request.Response) => {
          const { message } = res.body;

          expect(message).toEqual('No Vendor found');
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });
    it('should not create an appointment with a buyer who already has one that overlaps with the one to be created ', () => {
      const body: CreateAppointmentDto = {
        buyerId: existingBuyerWithAppointment.id,
        endTime: expectedEndTime,
        hostId: existingVendor.id,
        type: Type.PHYSICAL,
        location: 'Paris',
        startTime: expectedStartTime,
        title: 'Fashion week',
      };

      return request(app.getHttpServer())
        .post(appointmentUrl)

        .send(body)
        .expect((res: request.Response) => {
          const { message } = res.body;

          expect(message).toEqual('Buyer have already an appointment');
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });
    it('should not create an appointment with a vendor who already has one that overlaps with the one to be created ', () => {
      const body: CreateAppointmentDto = {
        buyerId: existingBuyer.id,
        endTime: expectedEndTime,
        hostId: existingVendorWithAppointment.id,
        type: Type.PHYSICAL,
        location: 'Paris',
        startTime: expectedStartTime,
        title: 'Fashion week',
      };

      return request(app.getHttpServer())
        .post(appointmentUrl)

        .send(body)
        .expect((res: request.Response) => {
          const { message } = res.body;

          expect(message).toEqual('Vendor have already an appointment');
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });
    it('should  create an appointment', () => {
      const body: CreateAppointmentDto = {
        buyerId: existingBuyer.id,
        endTime: expectedEndTime,
        hostId: existingVendorWithAppointmentNotInRange.id,
        type: Type.PHYSICAL,
        location: 'Paris',
        startTime: expectedStartTime,
        title: 'Fashion week',
      };

      return request(app.getHttpServer())
        .post(appointmentUrl)
        .send(body)
        .expect(HttpStatus.CREATED);
    });
  });
  afterAll(() => app.close());
});

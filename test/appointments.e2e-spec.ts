/* eslint-disable prettier/prettier */
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Buyer, Vendor } from '@prisma/client';
import * as request from 'supertest';
import { AppointmentModule } from '../src/appointments/appointments.module';
import { Type } from '../src/appointments/enum/type.enum';
import { LogicExceptionFilter } from '../src/filter-exception/buisness-filter-exception.filter';
import { PrismaClientExceptionFilter } from '../src/filter-exception/prima-filter-client-exception.filter';
import { PrismaService } from '../src/prisma-module/prisma.service';

describe('AppointmentsEndPoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let existingVendor: Vendor;
  let existingBuyer: Buyer;
  let existingVendorWithAppointment: Vendor;
  let existingBuyerWithAppointment: Buyer;
  let existingVendorWithAppointmentNotInRange;
  let appointmentToUpdate;
  const expectedStartTime = '2023-01-06T16:50z';
  const expectedEndTime = '2023-01-06T17:50z';
  const expectedStartTimeOutOfRange = '2023-01-06T14:50z';
  const expectedEndTimeOutOfRange = '2023-01-06T15:50z';

  const appointmentUrl = '/appointments';
  const existingAppointmentInDb = 3;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppointmentModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
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
  describe('retrieve appointment', () => {
    it('should return all appointements for a specific day', () => {
      return request(app.getHttpServer())
        .get(`${appointmentUrl}/byDay?day=${expectedStartTime}`)

        .expect((res: request.Response) => {
          const message = res.body;
          expect(message.length).toEqual(existingAppointmentInDb);
        })
        .expect(HttpStatus.OK);
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
            'startTime must be a Date instance',
            'endTime must be a Date instance',
          ]);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
    it('should not create an appointment with not existent buyer', () => {
      const body = {
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
      const body = {
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
    it('should not create an appointment if the buyer  already has one that overlaps with the one to be created ', () => {
      const body = {
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
    it('should not create an appointment if the vendor already has one that overlaps with the one to be created ', () => {
      const body = {
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
      const body = {
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
  describe('appointment update', () => {
    beforeAll(async () => {
      appointmentToUpdate = await prisma.appointment.create({
        data: {
          endTime: new Date(expectedEndTimeOutOfRange),
          startTime: new Date(expectedStartTimeOutOfRange),
          title: 'test',
          type: Type.VIRTUAL,
          link: 'mylink10',
          buyerId: existingBuyer.id,
          hostId: existingVendor.id,
        },
      });
      await prisma.appointment.create({
        data: {
          endTime: new Date(expectedEndTime),
          startTime: new Date(expectedStartTime),
          title: 'test4',
          type: Type.VIRTUAL,
          link: 'mylink3',
          buyerId: existingBuyer.id,
          hostId: existingVendor.id,
        },
      });
    });

    it('should not update an appointment if the buyer already has one that overlaps with the new time slot', () => {
      const body = {
        startTime: expectedStartTime,

        endTime: expectedEndTime,
      };
      return request(app.getHttpServer())
        .patch(`${appointmentUrl}/${appointmentToUpdate.id}`)

        .send(body)
        .expect((res: request.Response) => {
          const { message } = res.body;

          expect(message).toEqual('Buyer have already an appointment');
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should  update an appointment', () => {
      const body = {
        startTime: '2023-01-06T17:51Z',
        endTime: '2023-01-06T20:00Z',
      };
      return request(app.getHttpServer())
        .patch(`${appointmentUrl}/${appointmentToUpdate.id}`)

        .send(body)

        .expect(HttpStatus.OK);
    });
  });
  describe('delete appointment', () => {
    it("should return bad request if id don't exist ", () => {
      return request(app.getHttpServer())
        .delete(`${appointmentUrl}/25`)
        .expect((res: request.Response) => {
          const { message } = res.body;

          expect(message).toEqual('No Appointment found');
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it("should return bad request if id don't exist ", () => {
      return request(app.getHttpServer())
        .delete(`${appointmentUrl}/${appointmentToUpdate.id}`)

        .expect(HttpStatus.OK);
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.buyer.deleteMany();
    await prisma.company.deleteMany();
    app.close();
  });
});

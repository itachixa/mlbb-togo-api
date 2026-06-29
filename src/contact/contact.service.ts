import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  /** Enregistre un message de contact. */
  async create(dto: CreateContactDto) {
    await this.prisma.contactMessage.create({ data: dto });
    return { success: true, message: 'Message envoyé. Merci, nous reviendrons vers vous.' };
  }

  /** Liste des messages (réservé admin). */
  async findAll() {
    return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }
}

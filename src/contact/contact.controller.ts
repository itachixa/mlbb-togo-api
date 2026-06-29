import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  /** Envoi public d'un message de contact. */
  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contact.create(dto);
  }

  /** Liste des messages (admin / modérateur). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Get()
  findAll() {
    return this.contact.findAll();
  }
}

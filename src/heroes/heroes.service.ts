import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HeroesService {
  constructor(private prisma: PrismaService) {}

  /** Tous les héros, filtrés par rôle si fourni, triés par nom. */
  async findAll(role?: string) {
    return this.prisma.hero.findMany({
      where: role ? { role } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        role: true,
        image: true,
        description: true,
      },
    });
  }

  /** Un héros par son identifiant. */
  async findOne(id: string) {
    const hero = await this.prisma.hero.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        image: true,
        description: true,
      },
    });
    if (!hero) throw new NotFoundException('Héros introuvable.');
    return hero;
  }
}

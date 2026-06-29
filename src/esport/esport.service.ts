import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EsportService {
  constructor(private prisma: PrismaService) {}

  /** Organisation e-sport (la première) avec ses sous-équipes triées. */
  async getOrg() {
    return this.prisma.esport.findFirst({
      include: { teams: { orderBy: { sort: 'asc' } } },
    });
  }

  /** Liste des sous-équipes e-sport (triées). */
  async getTeams() {
    return this.prisma.esportTeam.findMany({ orderBy: { sort: 'asc' } });
  }

  /** Liste des sponsors (triés). */
  async getSponsors() {
    return this.prisma.sponsor.findMany({ orderBy: { sort: 'asc' } });
  }

  /** MTL (Mobile Legends Togo League) avec ses images dans l'ordre. */
  async getMtl() {
    return this.prisma.mtl.findFirst({
      include: { images: { orderBy: { sort: 'asc' } } },
    });
  }
}

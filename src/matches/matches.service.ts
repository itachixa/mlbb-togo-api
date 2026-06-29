import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hydrate, toJson } from '../common/utils/json.util';
import { CreateMatchDto } from './dto/create-match.dto';

function serialize(match: any) {
  if (!match) return match;
  return hydrate(match, ['team1', 'team2', 'games']);
}

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const matches = await this.prisma.match.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return matches.map(serialize);
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Match introuvable.');
    return serialize(match);
  }

  async create(dto: CreateMatchDto) {
    const match = await this.prisma.match.create({
      data: {
        team1: toJson(dto.team1),
        team2: toJson(dto.team2),
        tournament: dto.tournament,
        date: dto.date,
        status: dto.status ?? 'upcoming',
        mvp: dto.mvp,
        duration: dto.duration,
        format: dto.format,
        games: toJson(dto.games ?? []),
      },
    });
    return serialize(match);
  }
}

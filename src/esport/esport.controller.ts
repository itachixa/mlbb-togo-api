import { Controller, Get } from '@nestjs/common';
import { EsportService } from './esport.service';

/** Endpoints publics e-sport (organisation, équipes, sponsors) pour la page d'accueil. */
@Controller('esport')
export class EsportController {
  constructor(private readonly esport: EsportService) {}

  /** Organisation + sous-équipes. */
  @Get()
  getOrg() {
    return this.esport.getOrg();
  }

  /** Sous-équipes e-sport. */
  @Get('teams')
  getTeams() {
    return this.esport.getTeams();
  }

  /** Sponsors. */
  @Get('sponsors')
  getSponsors() {
    return this.esport.getSponsors();
  }

  /** MTL (Mobile Legends Togo League) + images. */
  @Get('mtl')
  getMtl() {
    return this.esport.getMtl();
  }
}

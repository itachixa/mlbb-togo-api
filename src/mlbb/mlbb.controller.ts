import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MlbbService } from './mlbb.service';

/**
 * Endpoints publics proxifiant l'API officielle Mobile Legends (Moonton GMS).
 * Le frontend appelle ces routes ; la signature et l'enigma sont gérés côté serveur.
 */
@Controller('mlbb')
export class MlbbController {
  constructor(private readonly mlbb: MlbbService) {}

  /** Proxy d'image du CDN Moonton (contourne le hotlink + fiabilise via retry/cache). */
  @Get('image')
  async image(
    @Query('url') url: string,
    @Query('w') w: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.mlbb.proxyImage(
      url,
      w ? Number(w) : undefined,
    );
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.send(buffer);
  }

  /** Galerie / liste des héros. ?limit=N pour tronquer, ?lang=fr|en|... */
  @Get('heroes')
  getHeroes(@Query('limit') limit?: string, @Query('lang') lang?: string) {
    return this.mlbb.getHeroes(limit ? Number(limit) : undefined, lang || 'en');
  }

  /** Les N héros les plus récents (défaut 6, comme la page d'accueil officielle). */
  @Get('heroes/latest')
  getLatest(@Query('count') count?: string, @Query('lang') lang?: string) {
    return this.mlbb.getLatestHeroes(count ? Number(count) : 6, lang || 'en');
  }

  /** Les N derniers héros au format « vitrine » riche (carrousel d'accueil). */
  @Get('heroes/showcase')
  getShowcase(@Query('count') count?: string, @Query('lang') lang?: string) {
    return this.mlbb.getShowcaseHeroes(count ? Number(count) : 6, lang || 'en');
  }

  /**
   * Classement méta des héros (win/pick/ban + synergies).
   * ?rank=101&matchType=0&limit=200&sort=winRate|pickRate|banRate&order=desc&lang=en
   */
  @Get('ranking')
  getRanking(
    @Query('rank') rank?: string,
    @Query('matchType') matchType?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'winRate' | 'pickRate' | 'banRate',
    @Query('order') order?: 'desc' | 'asc',
    @Query('lang') lang?: string,
  ) {
    return this.mlbb.getHeroRanking({
      rank,
      matchType: matchType != null ? Number(matchType) : undefined,
      limit: limit != null ? Number(limit) : undefined,
      sort,
      order,
      lang: lang || 'en',
    });
  }

  /** Détail complet d'un héros (compétences, skins, lore) par hero_id. */
  @Get('heroes/:heroId')
  getHero(@Param('heroId', ParseIntPipe) heroId: number, @Query('lang') lang?: string) {
    return this.mlbb.getHero(heroId, lang || 'en');
  }
}

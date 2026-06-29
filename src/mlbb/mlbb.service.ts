import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * Proxy de l'API interne Moonton GMS (mobilelegends.com).
 *
 * Signature reverse-engineerée :
 *   Authorization = base64( HMAC-SHA1( message, enigma ) )
 *   message = METHOD + "\n" + url.pathname + "\n" + query(non encodé) + "\n" + JSON.stringify(body)
 *   enigma  = clé fournie par GET /api/act/basev4 (non signé)
 *
 * On gère l'enigma et la signature côté serveur pour exposer au frontend
 * des endpoints propres (sans CORS ni Cloudflare côté navigateur).
 */
@Injectable()
export class MlbbService {
  private readonly logger = new Logger('MlbbService');

  private readonly BASE = 'https://api.gms.moontontech.com';
  private readonly APP_ID = '2669606';
  private readonly ACT_ID = '2669607';
  private readonly HEROES_SRC = '2756564';
  private readonly RANKING_SRC = '2756567';

  // Cache de l'enigma (clé HMAC), de la liste des héros et des classements.
  private enigmaCache: { value: string; expiresAt: number } | null = null;
  private heroesCache: { lang: string; records: any[]; expiresAt: number } | null = null;
  private rankingCache = new Map<string, { data: any; expiresAt: number }>();
  private imageCache = new Map<string, { buffer: Buffer; contentType: string }>();

  private commonHeaders() {
    return {
      'x-appid': this.APP_ID,
      'x-actid': this.ACT_ID,
      referer: 'https://www.mobilelegends.com/',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      accept: 'application/json, text/plain, */*',
    };
  }

  /** Récupère un enigma (clé HMAC), avec cache 10 min, réessais et repli sur la dernière valeur. */
  private async getEnigma(): Promise<string> {
    const now = Date.now();
    if (this.enigmaCache && this.enigmaCache.expiresAt > now) {
      return this.enigmaCache.value;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${this.BASE}/api/act/basev4?_t=${Date.now()}`, {
          headers: this.commonHeaders(),
        });
        const json: any = await res.json();
        const enigma = json?.data?.server?.enigma;
        if (enigma) {
          this.enigmaCache = { value: enigma, expiresAt: Date.now() + 10 * 60 * 1000 };
          return enigma;
        }
      } catch {
        /* réessai */
      }
    }
    // Moonton injoignable : on réutilise le dernier enigma connu (même expiré) si dispo.
    if (this.enigmaCache) return this.enigmaCache.value;
    throw new Error('enigma indisponible (Moonton injoignable).');
  }

  /** Calcule la signature Authorization pour une requête. */
  private sign(
    method: string,
    pathname: string,
    query: string,
    body: string,
    enigma: string,
  ): string {
    const message = [method.toUpperCase(), pathname, query || '', body || '{}'].join('\n');
    return crypto.createHmac('sha1', enigma).update(message, 'utf8').digest('base64');
  }

  /** Appel POST signé sur une source GMS. */
  private async callSource(sourceId: string, body: any, lang = 'en'): Promise<any> {
    const enigma = await this.getEnigma();
    const pathname = `/api/gms/source/${this.APP_ID}/${sourceId}`;
    const bodyStr = JSON.stringify(body);
    const auth = this.sign('POST', pathname, '', bodyStr, enigma);

    const res = await fetch(`${this.BASE}${pathname}`, {
      method: 'POST',
      headers: {
        ...this.commonHeaders(),
        'x-lang': lang,
        'content-type': 'application/json;charset=UTF-8',
        authorization: auth,
      },
      body: bodyStr,
    });
    const json: any = await res.json();
    if (json?.code !== 0) {
      this.logger.warn(`Réponse GMS code=${json?.code} message=${json?.message}`);
    }
    return json;
  }

  // ============ Proxy d'images (CDN Moonton peu fiable en direct) ============

  /**
   * Récupère une image du CDN Moonton côté serveur (pas de hotlink/referer),
   * avec réessais et cache mémoire, puis la renvoie au frontend.
   *
   * Certaines images du CDN sont gravement gonflées (PNG 100x100 de 16 Mo !) :
   * on réencode donc le raster en WebP redimensionné. Les SVG sont renvoyés tels quels.
   */
  async proxyImage(
    url: string,
    width?: number,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      throw new BadRequestException('URL invalide.');
    }
    const allowed = [
      'akmweb.youngjoygame.com',
      'akmwebstatic.yuanzhanapp.com',
      'akmpicture.youngjoygame.com',
    ];
    if (!allowed.includes(host)) {
      throw new BadRequestException('Hôte non autorisé.');
    }

    const targetWidth = width && width > 0 ? Math.min(width, 1280) : 1024;
    const cacheKey = `${url}|${targetWidth}`;
    const cached = this.imageCache.get(cacheKey);
    if (cached) return cached;

    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: {
            'user-agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
            accept: 'image/avif,image/webp,image/png,image/*,*/*',
          },
        });
        if (!res.ok) {
          lastErr = new Error('status ' + res.status);
          continue;
        }
        const raw = Buffer.from(await res.arrayBuffer());
        const srcType = res.headers.get('content-type') || 'image/png';

        let out: { buffer: Buffer; contentType: string };
        if (srcType.includes('svg')) {
          // Vectoriel : léger, renvoyé tel quel.
          out = { buffer: raw, contentType: 'image/svg+xml' };
        } else {
          // Raster : on redimensionne et recompresse en WebP (corrige les images gonflées).
          const buffer = await sharp(raw)
            .resize({ width: targetWidth, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
          out = { buffer, contentType: 'image/webp' };
        }

        if (this.imageCache.size > 800) this.imageCache.clear();
        this.imageCache.set(cacheKey, out);
        return out;
      } catch (e) {
        lastErr = e;
      }
    }
    throw new NotFoundException(
      `Image indisponible apres 3 essais: ${lastErr?.message ?? 'inconnu'}`,
    );
  }

  // ============ Héros ============

  /** Récupère les enregistrements bruts des héros (triés hero_id desc). */
  private async fetchHeroRecords(lang = 'en'): Promise<any[]> {
    const now = Date.now();
    if (this.heroesCache && this.heroesCache.lang === lang && this.heroesCache.expiresAt > now) {
      return this.heroesCache.records;
    }
    try {
      const json = await this.callSource(
        this.HEROES_SRC,
        {
          pageSize: 300,
          pageIndex: 1,
          filters: [],
          sorts: [{ data: { field: 'hero_id', order: 'desc' }, type: 'sequence' }],
          object: [],
        },
        lang,
      );
      const records: any[] = json?.data?.records ?? [];
      if (records.length) {
        this.heroesCache = { lang, records, expiresAt: now + 15 * 60 * 1000 };
        return records;
      }
    } catch (e: any) {
      this.logger.warn(`Moonton injoignable (héros), repli sur le cache : ${e?.message}`);
    }
    // Repli : dernières données connues (même expirées) ou tableau vide — jamais d'erreur 500.
    return this.heroesCache?.records ?? [];
  }

  /** Forme synthétique d'un héros (pour les listes / galerie). */
  private mapSummary(record: any) {
    const d = record?.data ?? {};
    const h = d.hero?.data ?? {};
    return {
      heroId: d.hero_id ?? h.heroid ?? null,
      name: h.name ?? null,
      image: d.head ?? h.head ?? null,
      imageBig: d.head_big ?? null,
      difficulty: h.difficulty != null ? Number(h.difficulty) : null,
      roles: (h.sortlabel ?? []).filter(Boolean),
      lanes: (h.roadsortlabel ?? []).filter(Boolean),
      specialities: (h.speciality ?? []).filter(Boolean),
      abilityShow: (h.abilityshow ?? []).map((x: any) => Number(x)),
    };
  }

  /** Forme détaillée (compétences, skins, lore) pour la page d'un héros. */
  private mapDetail(record: any) {
    const d = record?.data ?? {};
    const h = d.hero?.data ?? {};
    const skills: any[] = [];
    for (const group of h.heroskilllist ?? []) {
      for (const s of group.skilllist ?? []) {
        skills.push({
          id: s.skillid,
          name: s.skillname,
          description: s.skilldesc,
          icon: s.skillicon,
          video: s.skillvideo || null,
          cost: s['skillcd&cost'] || null,
          tags: (s.skilltag ?? []).map((t: any) => ({ name: t.tagname, color: t.tagrgb })),
        });
      }
    }
    const skins = (h.heroskin ?? []).map((sk: any) => ({
      name: sk.skinname ?? sk.name ?? null,
      image: sk.skinpic ?? sk.painting ?? sk.skinhead ?? null,
    }));
    return {
      ...this.mapSummary(record),
      story: h.story ?? null,
      tale: h.tale ?? null,
      painting: d.painting ?? h.painting ?? null,
      recommendLabel: h.recommendlevellabel ?? null,
      skills,
      skins,
    };
  }

  /** Galerie / liste paginée des héros (forme synthétique). */
  async getHeroes(limit?: number, lang = 'en') {
    const records = await this.fetchHeroRecords(lang);
    const mapped = records.map((r) => this.mapSummary(r));
    const sliced = limit && limit > 0 ? mapped.slice(0, limit) : mapped;
    return { total: records.length, heroes: sliced };
  }

  /** Les N héros les plus récents (par défaut 6, comme la page d'accueil officielle). */
  async getLatestHeroes(count = 6, lang = 'en') {
    const { heroes } = await this.getHeroes(count, lang);
    return heroes;
  }

  /**
   * Forme « vitrine » riche d'un héros (pour le carrousel d'accueil) :
   * grande illustration, vignette, rôles, spécialités, stats et icônes de compétences.
   */
  private mapShowcase(record: any) {
    const d = record?.data ?? {};
    const h = d.hero?.data ?? {};
    const skills: any[] = [];
    for (const group of h.heroskilllist ?? []) {
      for (const s of group.skilllist ?? []) {
        if (s.skillicon) skills.push({ name: s.skillname, icon: s.skillicon });
      }
    }
    const ability = (h.abilityshow ?? []).map((x: any) => Number(x) || 0);
    return {
      heroId: d.hero_id ?? h.heroid ?? null,
      name: h.name ?? null,
      // `painting` = découpe transparente du personnage (comme le site officiel) ;
      // `head_big` (illustration rectangulaire avec décor) en repli.
      art: d.painting ?? d.head_big ?? d.head ?? h.head ?? null,
      thumb: d.head ?? h.squarehead ?? h.head ?? null,
      roles: (h.sortlabel ?? []).filter(Boolean),
      lanes: (h.roadsortlabel ?? []).filter(Boolean),
      specialities: (h.speciality ?? []).filter(Boolean),
      // abilityshow = [Durability, Offense, Ability Effects, Difficulty]
      stats: {
        durability: ability[0] ?? 0,
        offense: ability[1] ?? 0,
        ability: ability[2] ?? 0,
        difficulty: ability[3] ?? 0,
      },
      skills: skills.slice(0, 4),
    };
  }

  /** Les N derniers héros au format vitrine (carrousel d'accueil). */
  async getShowcaseHeroes(count = 6, lang = 'en') {
    const records = await this.fetchHeroRecords(lang);
    return records.slice(0, count).map((r) => this.mapShowcase(r));
  }

  // ============ Classement méta (Hero Ranking) ============

  /** Forme propre d'une ligne du classement méta. */
  private mapRanking(record: any) {
    const d = record?.data ?? {};
    const mh = d.main_hero?.data ?? {};
    return {
      heroId: d.main_heroid ?? null,
      name: mh.name ?? null,
      image: mh.head ?? null,
      // Taux exprimés en fraction 0..1 (multiplier par 100 pour un pourcentage).
      winRate: d.main_hero_win_rate ?? null,
      pickRate: d.main_hero_appearance_rate ?? null,
      banRate: d.main_hero_ban_rate ?? null,
      // Meilleures synergies / partenaires (gain de win rate).
      synergies: (d.sub_hero ?? []).map((s: any) => ({
        heroId: s.heroid ?? null,
        image: s.hero?.data?.head ?? null,
        increaseWinRate: s.increase_win_rate ?? null,
      })),
    };
  }

  /**
   * Classement méta des héros (win/pick/ban + synergies).
   * @param rank      tier de rang (filtre bigrank, défaut "101")
   * @param matchType type de partie (0 = classé)
   * @param limit     nombre de héros (pageSize)
   * @param sort      winRate | pickRate | banRate
   */
  async getHeroRanking(opts: {
    rank?: string;
    matchType?: number;
    limit?: number;
    sort?: 'winRate' | 'pickRate' | 'banRate';
    order?: 'desc' | 'asc';
    lang?: string;
  } = {}) {
    const {
      rank = '101',
      matchType = 0,
      limit = 200,
      sort = 'winRate',
      order = 'desc',
      lang = 'en',
    } = opts;

    const fieldMap: Record<string, string> = {
      winRate: 'main_hero_win_rate',
      pickRate: 'main_hero_appearance_rate',
      banRate: 'main_hero_ban_rate',
    };
    const sortField = fieldMap[sort] ?? 'main_hero_win_rate';

    const cacheKey = JSON.stringify({ rank, matchType, limit, sortField, order, lang });
    const now = Date.now();
    const cached = this.rankingCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const body = {
      pageSize: limit,
      pageIndex: 1,
      filters: [
        { field: 'bigrank', operator: 'eq', value: String(rank) },
        { field: 'match_type', operator: 'eq', value: Number(matchType) },
      ],
      sorts: [
        { data: { field: sortField, order }, type: 'sequence' },
        { data: { field: 'main_heroid', order: 'desc' }, type: 'sequence' },
      ],
      fields: [
        'main_hero',
        'main_hero_appearance_rate',
        'main_hero_ban_rate',
        'main_hero_channel',
        'main_hero_win_rate',
        'main_heroid',
        'data.sub_hero.hero',
        'data.sub_hero.hero_channel',
        'data.sub_hero.increase_win_rate',
        'data.sub_hero.heroid',
      ],
    };

    const json = await this.callSource(this.RANKING_SRC, body, lang);
    const records: any[] = json?.data?.records ?? [];
    const result = {
      total: json?.data?.total ?? records.length,
      ranking: records.map((r) => this.mapRanking(r)),
    };
    this.rankingCache.set(cacheKey, { data: result, expiresAt: now + 10 * 60 * 1000 });
    return result;
  }

  /** Détail complet d'un héros par son hero_id. */
  async getHero(heroId: number, lang = 'en') {
    const records = await this.fetchHeroRecords(lang);
    const rec = records.find((r) => {
      const id = r?.data?.hero_id ?? r?.data?.hero?.data?.heroid;
      return Number(id) === Number(heroId);
    });
    if (!rec) {
      throw new NotFoundException(`Héros ${heroId} introuvable.`);
    }
    return this.mapDetail(rec);
  }
}

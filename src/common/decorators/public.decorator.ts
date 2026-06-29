import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marque une route comme publique (non protégée par le JwtAuthGuard global éventuel). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

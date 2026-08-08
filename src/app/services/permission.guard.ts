import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { SessionService } from './session.service';

/**
 * Ferme un écran à qui n'en a pas la permission.
 *
 * <p>Comme {@code sessionGuard}, ce garde n'ajoute aucune sécurité : le serveur refuse de toute
 * façon chaque appel dont la permission manque. Il évite d'ouvrir un écran qui ne se remplira
 * jamais, suivi d'une cascade de « cette action ne vous est pas ouverte ».</p>
 *
 * <p>La permission attendue est lue dans les données de la route :
 * {@code data: { permission: 'UTILISATEUR_LIRE' }}. Sans session connue, elle est d'abord
 * demandée au serveur — un rechargement de page ne doit pas renvoyer à la connexion.</p>
 */
export const permissionGuard: CanActivateFn = (route) => {
    const service = inject(SessionService);
    const router = inject(Router);

    const exigee = route.data?.['permission'] as string | undefined;
    const autorise = () => !exigee || service.peut(exigee)
        ? true
        : router.createUrlTree(['/licences']);

    if (service.session()) {
        return autorise();
    }

    return service.verifier().pipe(
        map(() => autorise()),
        catchError(() => of(router.createUrlTree(['/connexion'])))
    );
};

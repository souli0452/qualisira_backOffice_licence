import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { SessionService } from './session.service';

/**
 * Ferme les écrans tant qu'aucune session n'est ouverte.
 *
 * <p>Le serveur refuse de toute façon chaque appel : ce garde n'ajoute pas de sécurité, il évite
 * d'afficher des écrans vides suivis d'une cascade de messages d'erreur, là où l'utilisateur
 * attend simplement qu'on lui demande de se connecter.</p>
 *
 * <p>La session déjà connue évite un aller-retour ; sinon elle est vérifiée auprès du serveur,
 * seul juge.</p>
 */
export const sessionGuard: CanActivateFn = () => {
    const service = inject(SessionService);
    const router = inject(Router);

    if (service.session()) {
        return true;
    }

    return service.verifier().pipe(
        map(() => true),
        catchError(() => of(router.createUrlTree(['/connexion'])))
    );
};

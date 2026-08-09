import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Accompagne chaque appel de ce que la session exige, et ramène à la connexion si elle a expiré.
 *
 * <p>`withCredentials` d'abord : sans lui, le navigateur n'enverrait pas le cookie de session, et
 * tous les appels reviendraient en 401 alors que l'utilisateur est bien connecté.</p>
 *
 * <p>Puis le jeton anti-rejeu, que le serveur dépose dans un cookie lisible : la session étant
 * portée par un cookie, une écriture doit prouver qu'elle vient bien du back-office — sans quoi
 * un site tiers pourrait faire émettre une licence par le navigateur d'un administrateur
 * connecté.</p>
 *
 * <p>Enfin le 401 : une session expire au bout de quelques heures, et personne ne s'en aperçoit
 * avant d'enregistrer. Plutôt qu'un message d'erreur devant un formulaire rempli, la page de
 * connexion reprend la main.</p>
 */
export const intercepteurAntiRejeu: HttpInterceptorFn = (requete, suivant) => {
    const router = inject(Router);

    const cookie = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='));
    const jeton = cookie ? decodeURIComponent(cookie.substring('XSRF-TOKEN='.length)) : null;

    return suivant(requete.clone({
        withCredentials: true,
        setHeaders: jeton ? { 'X-XSRF-TOKEN': jeton } : {}
    })).pipe(
        catchError((erreur: HttpErrorResponse) => {
            // La vérification de session échoue légitimement en 401 : c'est ainsi que le garde
            // apprend qu'il faut se connecter. La rediriger ferait boucler l'écran sur lui-même.
            // « includes » et non « endsWith » sur l'adresse complète : en développement elle
            // est absolue (http://localhost:8099/api/session), et une comparaison de fin
            // n'aurait plus reconnu la vérification de session — chaque ouverture d'écran
            // aurait alors renvoyé à la connexion.
            const verificationDeSession = requete.url.endsWith('/api/session')
                || requete.url.includes('/api/session/connexion')
                || requete.url.includes('/api/session/mode');
            if (erreur.status === 401 && !verificationDeSession) {
                router.navigate(['/connexion']);
            }
            return throwError(() => erreur);
        })
    );
};

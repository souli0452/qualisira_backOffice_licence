import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { ModeDAuthentification, Session } from '../models/licences.model';

/**
 * La session du back-office, telle que le serveur la tient.
 *
 * <p>Rien n'est conservé côté client : ni mot de passe, ni jeton dans le stockage local. La
 * session vit dans un cookie que le script de la page ne peut pas lire, et que le navigateur
 * joint seul à chaque appel. Un script tiers injecté n'aurait donc rien à exfiltrer.</p>
 *
 * <p>L'état connu ici n'est qu'un reflet, destiné à l'affichage : c'est le serveur qui tranche,
 * et un 401 ramène à l'écran de connexion quoi qu'en dise ce reflet.</p>
 */
@Injectable({ providedIn: 'root' })
export class SessionService {

    private readonly http = inject(HttpClient);

    readonly session = signal<Session | undefined>(undefined);

    /**
     * Comment on se connecte ici — la seule question qu'on puisse poser avant d'être entré.
     *
     * <p>L'écran de connexion ne peut pas le deviner. Présenter un formulaire là où le serveur
     * attend Keycloak mènerait à un refus dont l'utilisateur ne pourrait rien conclure : ni que
     * son mot de passe est bon, ni qu'il n'a simplement pas frappé à la bonne porte.</p>
     */
    mode(): Observable<ModeDAuthentification> {
        return this.http.get<ModeDAuthentification>('/api/session/mode');
    }

    /**
     * Envoie la fenêtre entière vers Keycloak.
     *
     * <p>Une navigation, et non un appel : le fournisseur d'identité répond par sa page de
     * connexion, qu'un XHR ne saurait ni afficher ni suivre. Spring reconnaît cette adresse et
     * enclenche le flot du code d'autorisation ; la session est ouverte au retour.</p>
     */
    connexionKeycloak(): void {
        window.location.href = '/oauth2/authorization/keycloak';
    }

    /**
     * Ferme la session du royaume en même temps que celle-ci.
     *
     * <p>Un formulaire plutôt qu'un appel, pour la même raison qu'à l'aller : Spring répond par
     * une redirection vers Keycloak, que le navigateur doit suivre pour de bon. Le jeton
     * anti-rejeu y est joint en champ caché — la déconnexion est une écriture comme une autre, et
     * sans lui elle serait refusée.</p>
     *
     * <p>Sans ce passage par le royaume, seule la session locale serait fermée : le cookie de
     * Keycloak rouvrirait la suivante sans rien demander, et « se déconnecter » ne déconnecterait
     * de rien sur un poste partagé.</p>
     */
    deconnexionKeycloak(): void {
        const cookie = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='));
        const formulaire = document.createElement('form');
        formulaire.method = 'post';
        formulaire.action = '/logout';
        if (cookie) {
            const champ = document.createElement('input');
            champ.type = 'hidden';
            champ.name = '_csrf';
            champ.value = decodeURIComponent(cookie.substring('XSRF-TOKEN='.length));
            formulaire.appendChild(champ);
        }
        document.body.appendChild(formulaire);
        formulaire.submit();
    }

    /** Relit la session auprès du serveur ; échoue si elle n'est pas ouverte. */
    verifier(): Observable<Session> {
        return this.http.get<Session>('/api/session').pipe(
            tap((session) => this.session.set(session)),
            catchError((erreur: HttpErrorResponse) => {
                this.session.set(undefined);
                return throwError(() => erreur);
            })
        );
    }

    connexion(utilisateur: string, motDePasse: string): Observable<Session> {
        return this.http.post<Session>('/api/session/connexion', { utilisateur, motDePasse }).pipe(
            tap((session) => this.session.set(session)),
            catchError((erreur: HttpErrorResponse) => throwError(
                () => new Error(erreur.error?.message ?? 'Connexion impossible.')))
        );
    }

    deconnexion(): Observable<unknown> {
        return this.http.post('/api/session/deconnexion', {}).pipe(
            tap(() => this.session.set(undefined))
        );
    }

    /** Le titulaire change son propre mot de passe ; l'ancien est exigé par le serveur. */
    changerLeMotDePasse(ancien: string, nouveau: string): Observable<unknown> {
        return this.http.post('/api/session/mot-de-passe', { ancien, nouveau }).pipe(
            tap(() => {
                const ouverte = this.session();
                if (ouverte) {
                    this.session.set({ ...ouverte, doitChangerMotDePasse: false });
                }
            }),
            catchError((erreur: HttpErrorResponse) => throwError(
                () => new Error(erreur.error?.message ?? 'Changement impossible.')))
        );
    }

    /**
     * Ce que la session ouvre — pour masquer ce qui est fermé.
     *
     * <p>Un confort d'affichage, et rien de plus : c'est le serveur qui refuse les appels dont la
     * permission manque. Se fier à ce seul contrôle reviendrait à laisser l'accès à qui sait
     * taper une adresse.</p>
     */
    peut(...permissions: string[]): boolean {
        const ouverte = this.session();
        if (!ouverte) {
            return false;
        }
        return permissions.some((permission) => ouverte.permissions?.includes(permission));
    }
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { CompteCree, DemandeDeCompte, DemandeDePage, PageVue, Permission, Role, Utilisateur } from '../models/licences.model';

/**
 * Les comptes et les rôles, vus depuis le back-office.
 *
 * <p>Le mot de passe n'est jamais reçu du serveur, sauf une fois : celui qu'il tire au hasard à
 * la création ou à la réinitialisation d'un compte. Il faut donc le montrer à ce moment-là — il
 * n'existe plus ensuite, la base n'en garde que l'empreinte.</p>
 *
 * <p>Les messages d'erreur du serveur sont remontés tels quels : il rédige des refus destinés à
 * être lus — « ce compte est le dernier super administrateur actif ».</p>
 */
@Injectable({ providedIn: 'root' })
export class ComptesService {

    private readonly http = inject(HttpClient);

    // ------------------------------------------------------------ comptes

    comptes(demande: DemandeDePage): Observable<PageVue<Utilisateur>> {
        const params: Record<string, string | number> = {
            page: demande.page, taille: demande.taille
        };
        if (demande.recherche) {
            params['recherche'] = demande.recherche;
        }
        return this.http.get<PageVue<Utilisateur>>('/api/utilisateurs', { params })
            .pipe(catchError(this.echec));
    }

    creerCompte(demande: DemandeDeCompte): Observable<CompteCree> {
        return this.http.post<CompteCree>('/api/utilisateurs', demande).pipe(catchError(this.echec));
    }

    modifierCompte(id: string, demande: DemandeDeCompte): Observable<Utilisateur> {
        return this.http.put<Utilisateur>(`/api/utilisateurs/${id}`, demande)
            .pipe(catchError(this.echec));
    }

    activerCompte(id: string, actif: boolean): Observable<Utilisateur> {
        return this.http.post<Utilisateur>(`/api/utilisateurs/${id}/activation`, { actif })
            .pipe(catchError(this.echec));
    }

    /** Rend le mot de passe provisoire quand le serveur l'a tiré au hasard. */
    reinitialiser(id: string, motDePasse?: string): Observable<{ motDePasseProvisoire: string | null }> {
        return this.http.post<{ motDePasseProvisoire: string | null }>(
            `/api/utilisateurs/${id}/mot-de-passe`, { motDePasse: motDePasse ?? null })
            .pipe(catchError(this.echec));
    }

    supprimerCompte(id: string): Observable<unknown> {
        return this.http.delete(`/api/utilisateurs/${id}`).pipe(catchError(this.echec));
    }

    // ------------------------------------------------------------ rôles

    roles(): Observable<Role[]> {
        return this.http.get<Role[]>('/api/roles').pipe(catchError(this.echec));
    }

    /** Le catalogue complet, tel que le serveur le tient : l'écran y coche des cases. */
    permissions(): Observable<Permission[]> {
        return this.http.get<Permission[]>('/api/roles/permissions').pipe(catchError(this.echec));
    }

    creerRole(role: Partial<Role>): Observable<Role> {
        return this.http.post<Role>('/api/roles', role).pipe(catchError(this.echec));
    }

    modifierRole(id: string, role: Partial<Role>): Observable<Role> {
        return this.http.put<Role>(`/api/roles/${id}`, role).pipe(catchError(this.echec));
    }

    supprimerRole(id: string): Observable<unknown> {
        return this.http.delete(`/api/roles/${id}`).pipe(catchError(this.echec));
    }

    private echec(erreur: HttpErrorResponse) {
        const message = erreur.error?.message
            || (erreur.status === 0
                ? "Le service de licences est injoignable. Est-il démarré sur le port 8099 ?"
                : `Erreur ${erreur.status}`);
        return throwError(() => new Error(message));
    }
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

import {
    ContenuDeLicence,
    DemandeDeLicence,
    DemandeDePage,
    PageVue,
    PartenaireVue,
    Licence,
    ModuleVendable,
    OffreAbonnement,
    Partenaire,
    Session
} from '../models/licences.model';

/**
 * Le service de licences, vu depuis le back-office.
 *
 * <p>Les messages d'erreur du serveur sont remontés tels quels : il rédige des refus destinés à
 * être lus — « le code CHU-ABJ est déjà attribué », « un essai a déjà été accordé ». Les
 * remplacer par « une erreur est survenue » priverait l'utilisateur de la seule information qui
 * lui permet de corriger.</p>
 */
@Injectable({ providedIn: 'root' })
export class LicencesService {

    private readonly http = inject(HttpClient);

    /** Les paramètres d'une page, la recherche omise quand elle est vide. */
    private parametres(demande: DemandeDePage): Record<string, string | number> {
        const params: Record<string, string | number> = {
            page: demande.page, taille: demande.taille
        };
        if (demande.recherche) {
            params['recherche'] = demande.recherche;
        }
        return params;
    }

    // ------------------------------------------------------------ partenaires

    /** Une page de partenaires, filtrée par le serveur — pour l'écran du fichier clients. */
    pagePartenaires(demande: DemandeDePage): Observable<PageVue<PartenaireVue>> {
        return this.http.get<PageVue<PartenaireVue>>(`${environment.apiUrl}/api/partenaires`,
            { params: this.parametres(demande) }).pipe(catchError(this.echec));
    }

    /**
     * Tous les partenaires, pour les listes déroulantes.
     *
     * <p>Non paginé, et c'est voulu : celui qu'on cherche dans une liste de choix serait au-delà
     * de la première page, sans que rien ne le dise.</p>
     */
    partenaires(): Observable<Partenaire[]> {
        return this.http.get<Partenaire[]>(`${environment.apiUrl}/api/partenaires/selection`).pipe(catchError(this.echec));
    }

    creerPartenaire(partenaire: Partenaire): Observable<Partenaire> {
        return this.http.post<Partenaire>(`${environment.apiUrl}/api/partenaires`, partenaire).pipe(catchError(this.echec));
    }

    modifierPartenaire(id: string, partenaire: Partenaire): Observable<Partenaire> {
        return this.http.put<Partenaire>(`${environment.apiUrl}/api/partenaires/${id}`, partenaire).pipe(catchError(this.echec));
    }

    // ------------------------------------------------------------ offres

    offres(): Observable<OffreAbonnement[]> {
        return this.http.get<OffreAbonnement[]>(`${environment.apiUrl}/api/offres`).pipe(catchError(this.echec));
    }

    modulesVendables(): Observable<ModuleVendable[]> {
        return this.http.get<ModuleVendable[]>(`${environment.apiUrl}/api/offres/modules`).pipe(catchError(this.echec));
    }

    creerOffre(offre: OffreAbonnement): Observable<OffreAbonnement> {
        return this.http.post<OffreAbonnement>(`${environment.apiUrl}/api/offres`, offre).pipe(catchError(this.echec));
    }

    modifierOffre(id: string, offre: OffreAbonnement): Observable<OffreAbonnement> {
        return this.http.put<OffreAbonnement>(`${environment.apiUrl}/api/offres/${id}`, offre).pipe(catchError(this.echec));
    }

    // ------------------------------------------------------------ licences

    licences(demande: DemandeDePage): Observable<PageVue<Licence>> {
        return this.http.get<PageVue<Licence>>(`${environment.apiUrl}/api/licences`, { params: this.parametres(demande) })
            .pipe(catchError(this.echec));
    }

    emettre(demande: DemandeDeLicence): Observable<Licence> {
        return this.http.post<Licence>(`${environment.apiUrl}/api/licences`, demande).pipe(catchError(this.echec));
    }

    emettreEssai(partenaireId: string, jours?: number): Observable<Licence> {
        return this.http.post<Licence>(`${environment.apiUrl}/api/licences/essai`, { partenaireId, jours })
            .pipe(catchError(this.echec));
    }

    revoquer(id: string, motif: string): Observable<Licence> {
        return this.http.post<Licence>(`${environment.apiUrl}/api/licences/${id}/revoquer`, { motif })
            .pipe(catchError(this.echec));
    }

    envoyer(id: string, destinataire: string): Observable<Licence> {
        return this.http.post<Licence>(`${environment.apiUrl}/api/licences/${id}/envoyer`, { destinataire })
            .pipe(catchError(this.echec));
    }

    /** Adresse du fichier .lic — le navigateur s'en charge, la session accompagne la requête. */
    adresseDuFichier(id: string): string {
        return `${environment.apiUrl}/api/licences/${id}/fichier`;
    }

    verifier(jeton: string): Observable<ContenuDeLicence> {
        return this.http.post<ContenuDeLicence>(`${environment.apiUrl}/api/licences/verifier`, { jeton })
            .pipe(catchError(this.echec));
    }

    clePublique(): Observable<{ algorithme: string; clePublique: string; proprieteSpring: string }> {
        return this.http.get<{ algorithme: string; clePublique: string; proprieteSpring: string }>(
            `${environment.apiUrl}/api/licences/cle-publique`).pipe(catchError(this.echec));
    }

    session(): Observable<Session> {
        return this.http.get<Session>(`${environment.apiUrl}/api/session`).pipe(catchError(this.echec));
    }

    private echec(erreur: HttpErrorResponse) {
        const message = erreur.error?.message
            || (erreur.status === 0
                ? "Le service de licences est injoignable. Est-il démarré sur le port 8099 ?"
                : `Erreur ${erreur.status}`);
        return throwError(() => new Error(message));
    }
}

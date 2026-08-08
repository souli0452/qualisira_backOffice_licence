import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { Parametre } from '../models/licences.model';

/**
 * Les réglages de l'application : ce qui figure au bas des courriels de licence.
 *
 * <p>On ne crée ni ne supprime rien : la liste des clés appartient au serveur, qui les sème au
 * démarrage. Seule leur valeur se modifie — sans quoi il faudrait livrer une version pour changer
 * un numéro de téléphone.</p>
 */
@Injectable({ providedIn: 'root' })
export class ParametresService {

    private readonly http = inject(HttpClient);

    lister(): Observable<Parametre[]> {
        return this.http.get<Parametre[]>('/api/parametres');
    }

    /**
     * Change la valeur d'un réglage, désigné par sa clé.
     *
     * <p>Le message d'erreur du serveur est repris tel quel : c'est lui qui sait pourquoi une
     * adresse est refusée ou un logo trop lourd, et le reformuler ici ferait diverger deux
     * explications de la même règle.</p>
     */
    modifier(cle: string, valeur: string | null): Observable<Parametre> {
        return this.http.put<Parametre>(`/api/parametres/${cle}`, { valeur }).pipe(
            catchError((erreur: HttpErrorResponse) => throwError(
                () => new Error(erreur.error?.message ?? 'Enregistrement impossible.')))
        );
    }
}

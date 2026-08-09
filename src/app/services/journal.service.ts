import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { EntreeDeJournal, PageVue } from '../models/licences.model';

/** Ce que chacun a fait dans l'outil. En lecture seule : rien ne s'y modifie ni ne s'y supprime. */
@Injectable({ providedIn: 'root' })
export class JournalService {

    private readonly http = inject(HttpClient);

    lister(criteres: {
        page: number; taille: number; recherche?: string;
        auteur?: string; depuis?: string; jusqua?: string; abouti?: boolean;
    }): Observable<PageVue<EntreeDeJournal>> {
        const params: Record<string, string | number | boolean> = {
            page: criteres.page, taille: criteres.taille
        };
        // Les critères vides sont omis plutôt qu'envoyés à blanc : « auteur= » filtrerait sur une
        // chaîne vide et ne rendrait rien.
        if (criteres.recherche) params['recherche'] = criteres.recherche;
        if (criteres.auteur) params['auteur'] = criteres.auteur;
        if (criteres.depuis) params['depuis'] = criteres.depuis;
        if (criteres.jusqua) params['jusqua'] = criteres.jusqua;
        if (criteres.abouti !== undefined) params['abouti'] = criteres.abouti;
        return this.http.get<PageVue<EntreeDeJournal>>(`${environment.apiUrl}/api/journal`, { params });
    }
}

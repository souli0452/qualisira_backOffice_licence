import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TableauDeBord } from '../models/licences.model';

/** Les indicateurs de l'écran d'accueil, calculés par le serveur. */
@Injectable({ providedIn: 'root' })
export class TableauDeBordService {

    private readonly http = inject(HttpClient);

    indicateurs(): Observable<TableauDeBord> {
        return this.http.get<TableauDeBord>('/api/tableau-de-bord');
    }
}

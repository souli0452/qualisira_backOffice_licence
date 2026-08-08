import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { DemandeDePage, EntreeDeJournal } from '../models/licences.model';
import { JournalService } from '../services/journal.service';
import { ColonneTableau, GabaritColonneDirective, TableauComponent } from '../shared';

/**
 * Le journal des actions : qui a fait quoi, et quand.
 *
 * <p>Cet outil signe les licences. Le nom de l'émetteur figure déjà dans chaque licence, mais rien
 * ne disait qui avait suspendu un compte, changé les permissions d'un rôle ou remplacé une
 * coordonnée — des gestes qui ne laissent aucune trace dans leur résultat.</p>
 *
 * <p>Aucune action n'est offerte sur une ligne, et c'est voulu : un registre qu'on peut retoucher
 * depuis l'application ne prouve rien.</p>
 */
@Component({
    selector: 'app-journal',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DatePickerModule, SelectModule, TagModule,
        TooltipModule, TableauComponent, GabaritColonneDirective],
    template: `
        <div class="entete">
            <div>
                <h1>Journal des actions</h1>
                <p>Ce que chacun a fait dans cet outil. Les refus y figurent au même titre que les
                   succès — ce sont souvent eux qu'on vient chercher. Rien ne s'y modifie.</p>
            </div>
        </div>

        <div class="carte">
            <div class="carte-corps filtres">
                <div class="champ">
                    <label>Du</label>
                    <p-datePicker [(ngModel)]="depuis" dateFormat="dd/mm/yy" appendTo="body"
                                  [showClear]="true" placeholder="toutes dates"
                                  (onSelect)="relancer()" (onClear)="relancer()"></p-datePicker>
                </div>
                <div class="champ">
                    <label>Au</label>
                    <p-datePicker [(ngModel)]="jusqua" dateFormat="dd/mm/yy" appendTo="body"
                                  [showClear]="true" placeholder="toutes dates"
                                  (onSelect)="relancer()" (onClear)="relancer()"></p-datePicker>
                </div>
                <div class="champ">
                    <label>Issue</label>
                    <p-select [(ngModel)]="issue" [options]="issues" optionLabel="libelle"
                              optionValue="valeur" appendTo="body"
                              (onChange)="relancer()"></p-select>
                </div>
                <div class="champ" style="justify-content:flex-end">
                    <p-button label="Tout effacer" icon="pi pi-filter-slash" severity="secondary"
                              [text]="true" (onClick)="effacerLesFiltres()"></p-button>
                </div>
            </div>
        </div>

        <div class="carte">
            <app-tableau [lignes]="entrees()" [colonnes]="colonnes" [chargement]="chargement()"
                         [total]="total()" (pageDemandee)="demanderLaPage($event)"
                         [lignesParPage]="25" [optionsDePagination]="[25, 50, 100]"
                         [recherche]="['action','auteur','objet']"
                         placeholderRecherche="Rechercher une action, une personne…"
                         messageVide="Aucune action ne correspond.">

                <ng-template gabaritColonne="quand" let-entree>
                    <div class="principal">{{ entree.quand | date: 'dd/MM/yyyy' }}</div>
                    <div class="secondaire">{{ entree.quand | date: 'HH:mm:ss' }}</div>
                </ng-template>

                <ng-template gabaritColonne="auteur" let-entree>
                    <div class="principal">{{ entree.auteur }}</div>
                    @if (entree.adresse) {
                        <div class="secondaire">{{ entree.adresse }}</div>
                    }
                </ng-template>

                <ng-template gabaritColonne="action" let-entree>
                    <div class="principal">{{ entree.action }}</div>
                    <div class="secondaire" [pTooltip]="entree.requete" tooltipPosition="top">
                        {{ entree.objet || '—' }}{{ entree.objetId ? ' · ' + abrege(entree.objetId) : '' }}
                    </div>
                </ng-template>

                <ng-template gabaritColonne="issue" let-entree>
                    <p-tag [severity]="entree.abouti ? 'success' : 'danger'"
                           [value]="entree.abouti ? 'Abouti' : 'Refusé'"></p-tag>
                    @if (entree.motif) {
                        <div class="secondaire" style="margin-top:.25rem">{{ entree.motif }}</div>
                    }
                </ng-template>

                <ng-template gabaritColonne="duree" let-entree>
                    <span class="secondaire">{{ entree.duree }} ms</span>
                </ng-template>
            </app-tableau>
        </div>
    `,
    styles: [`
        .filtres {
            display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;
        }
        .filtres .champ { min-width: 11rem; }
    `]
})
export class JournalComponent {

    private readonly service = inject(JournalService);

    protected readonly entrees = signal<EntreeDeJournal[]>([]);
    protected readonly total = signal(0);
    protected readonly chargement = signal(false);

    protected depuis?: Date;
    protected jusqua?: Date;
    protected issue?: boolean;

    protected readonly issues = [
        { libelle: 'Toutes', valeur: undefined },
        { libelle: 'Abouties', valeur: true },
        { libelle: 'Refusées', valeur: false }
    ];

    protected readonly colonnes: ColonneTableau[] = [
        { entete: 'Quand', gabarit: 'quand', largeur: '9rem' },
        { entete: 'Qui', gabarit: 'auteur', largeur: '12rem' },
        { entete: 'Action', gabarit: 'action' },
        { entete: 'Issue', gabarit: 'issue', largeur: '16rem' },
        { entete: 'Durée', gabarit: 'duree', largeur: '6rem' }
    ];

    private derniereDemande: DemandeDePage = { page: 0, taille: 25 };

    protected demanderLaPage(demande: DemandeDePage): void {
        this.derniereDemande = demande;
        this.charger();
    }

    /** Un filtre changé repart de la première page : rester en page 4 d'un autre résultat n'a pas de sens. */
    protected relancer(): void {
        this.derniereDemande = { ...this.derniereDemande, page: 0 };
        this.charger();
    }

    protected effacerLesFiltres(): void {
        this.depuis = undefined;
        this.jusqua = undefined;
        this.issue = undefined;
        this.relancer();
    }

    private charger(): void {
        this.chargement.set(true);
        this.service.lister({
            ...this.derniereDemande,
            depuis: this.jour(this.depuis),
            jusqua: this.jour(this.jusqua),
            abouti: this.issue
        }).subscribe({
            next: (page) => {
                this.entrees.set(page.contenu);
                this.total.set(page.total);
                this.chargement.set(false);
            },
            error: () => this.chargement.set(false)
        });
    }

    /**
     * La date au format que le serveur attend, dans le fuseau local.
     *
     * <p>{@code toISOString()} bascule en UTC : passé 22 h à Ouagadougou, la journée choisie
     * partirait décalée d'un jour, et le filtre rendrait les actions de la veille.</p>
     */
    private jour(date?: Date): string | undefined {
        if (!date) {
            return undefined;
        }
        const mois = `${date.getMonth() + 1}`.padStart(2, '0');
        const jour = `${date.getDate()}`.padStart(2, '0');
        return `${date.getFullYear()}-${mois}-${jour}`;
    }

    /** Un UUID entier déborde la colonne sans rien apprendre : ses huit premiers suffisent à rapprocher. */
    protected abrege(identifiant: string): string {
        return identifiant.length > 8 ? identifiant.slice(0, 8) : identifiant;
    }
}

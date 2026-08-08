import { CommonModule } from '@angular/common';
import { AfterContentInit, Component, ContentChildren, EventEmitter, Input, Output, QueryList, TemplateRef } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { DemandeDePage } from '../models/licences.model';
import { ActionDeLigne, ActionsLigneComponent } from './actions-ligne.component';
import { GabaritColonneDirective } from './gabarit-colonne.directive';

/** Une colonne du tableau. */
export interface ColonneTableau {
    entete: string;
    /** Propriété affichée telle quelle, quand la colonne n'a pas de rendu propre. */
    champ?: string;
    /** Nom d'un {@code ng-template gabaritColonne} fourni par l'écran, s'il faut mieux qu'un texte. */
    gabarit?: string;
    /** Largeur fixe — « 8rem ». Sans elle, la colonne prend ce qui reste. */
    largeur?: string;
}

/**
 * La coquille commune à tous les tableaux du back-office.
 *
 * <p>Chaque écran réécrivait la même chose : le chargement, la pagination au-delà de dix lignes, la
 * recherche en légende, le message d'absence, et une colonne d'actions au bout. Cinq copies d'un
 * même geste, qui divergeaient déjà — un écran paginait à 10, un autre pas du tout ; l'un proposait
 * une recherche, l'autre non, sans que rien ne le justifie.</p>
 *
 * <p>Ce qui reste propre à un écran — un état en pastille, une ligne secondaire sous un libellé —
 * est fourni par gabarit ({@link GabaritColonneDirective}) : le générique dispose, l'écran décide
 * de ce que ses données veulent dire.</p>
 *
 * <p>Les actions passent par {@link ActionsLigneComponent}, qui les replie sous les trois points
 * dès qu'elles sont nombreuses.</p>
 */
@Component({
    selector: 'app-tableau',
    standalone: true,
    imports: [CommonModule, TableModule, InputTextModule, ActionsLigneComponent],
    template: `
        <p-table [value]="lignes" [loading]="chargement"
                 [lazy]="paginationServeur" [totalRecords]="total ?? lignes.length"
                 (onLazyLoad)="tourner($event)"
                 [paginator]="paginer && (total ?? lignes.length) > lignesParPage"
                 [rows]="lignesParPage" [rowsPerPageOptions]="optionsDePagination"
                 [globalFilterFields]="paginationServeur ? [] : recherche"
                 [first]="premier" #tableau>

            @if (recherche.length > 0) {
                <ng-template pTemplate="caption">
                    <input pInputText type="text" [placeholder]="placeholderRecherche"
                           (input)="chercher($any($event.target).value, tableau)"
                           style="width:22rem">
                </ng-template>
            }

            <ng-template pTemplate="header">
                <tr>
                    @for (colonne of colonnes; track colonne.entete) {
                        <th [style.width]="colonne.largeur">{{ colonne.entete }}</th>
                    }
                    @if (actions) {
                        <!-- Sans intitulé : « Actions » au-dessus de deux icônes n'apprend rien,
                             et la colonne se reconnaît à sa place, au bout de la ligne. -->
                        <th [style.width]="largeurDesActions"></th>
                    }
                </tr>
            </ng-template>

            <ng-template pTemplate="body" let-ligne>
                <tr>
                    @for (colonne of colonnes; track colonne.entete) {
                        <td>
                            @if (colonne.gabarit && gabarit(colonne.gabarit); as modele) {
                                <ng-container [ngTemplateOutlet]="modele"
                                              [ngTemplateOutletContext]="{ $implicit: ligne }">
                                </ng-container>
                            } @else {
                                {{ valeur(ligne, colonne) }}
                            }
                        </td>
                    }
                    @if (actions) {
                        <td>
                            <app-actions-ligne [actions]="actions(ligne)"
                                               [seuil]="seuilDesActions"></app-actions-ligne>
                        </td>
                    }
                </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
                <tr>
                    <td [attr.colspan]="colonnes.length + (actions ? 1 : 0)">
                        <div class="vide">{{ messageVide }}</div>
                    </td>
                </tr>
            </ng-template>
        </p-table>
    `
})
export class TableauComponent implements AfterContentInit {

    @Input({ required: true }) lignes: any[] = [];
    @Input({ required: true }) colonnes: ColonneTableau[] = [];
    @Input() chargement = false;

    /**
     * Les actions offertes sur une ligne.
     *
     * <p>Une fonction plutôt qu'une liste figée : ce qui est ouvert dépend de la ligne — on ne
     * supprime pas un rôle fourni par l'application, on ne rétablit pas un compte déjà actif.</p>
     */
    @Input() actions?: (ligne: any) => ActionDeLigne[];

    /** Au-delà, les actions passent sous les trois points. */
    @Input() seuilDesActions = 2;

    @Input() largeurDesActions = '6rem';

    /** Champs sur lesquels porte la recherche. Vide, aucune légende n'est affichée. */
    @Input() recherche: string[] = [];

    @Input() placeholderRecherche = 'Rechercher…';

    @Input() messageVide = 'Aucune ligne.';

    /**
     * Pagination au-delà de ce nombre de lignes.
     *
     * <p>Pas en deçà : un tableau de six lignes surmonté d'une pagination donne à croire qu'il en
     * cache d'autres.</p>
     */
    @Input() lignesParPage = 10;

    @Input() paginer = true;

    @Input() optionsDePagination: number[] = [10, 25, 50];

    /**
     * Nombre total de lignes côté serveur.
     *
     * <p>Sa présence bascule le tableau en pagination <b>serveur</b> : il ne détient plus qu'une
     * page, et c'est le serveur qui compte, filtre et découpe. Absent, tout est déjà là et le
     * tableau se débrouille — ce qui reste juste pour un catalogue borné, comme les rôles ou les
     * réglages.</p>
     */
    @Input() total?: number;

    /**
     * Ce que le tableau réclame quand on tourne une page ou qu'on cherche.
     *
     * <p>Émis aussi au premier affichage : l'écran n'a donc pas à charger lui-même sa première
     * page, et ne peut pas la charger avec des critères que le tableau ignorerait.</p>
     */
    @Output() pageDemandee = new EventEmitter<DemandeDePage>();

    /** Position de la première ligne — remise à zéro dès que la recherche change. */
    protected premier = 0;

    private terme = '';
    private readonly frappes = new Subject<string>();

    constructor() {
        // Une requête par caractère saisi ferait peser la recherche sur le serveur autant que sur
        // le réseau ; l'attente laisse le temps de finir un mot.
        this.frappes.pipe(debounceTime(300), distinctUntilChanged()).subscribe((terme) => {
            this.terme = terme;
            this.premier = 0;
            this.pageDemandee.emit({ page: 0, taille: this.lignesParPage, recherche: terme });
        });
    }

    protected get paginationServeur(): boolean {
        return this.total !== undefined;
    }

    protected chercher(terme: string, tableau: { filterGlobal: (v: string, m: string) => void }): void {
        if (this.paginationServeur) {
            this.frappes.next(terme ?? '');
            return;
        }
        tableau.filterGlobal(terme, 'contains');
    }

    /**
     * Une page réclamée par la pagination de PrimeNG.
     *
     * <p>Ignorée hors pagination serveur : le tableau découpe alors lui-même ce qu'il détient, et
     * relayer l'événement ferait recharger l'écran pour rien.</p>
     */
    protected tourner(evenement: TableLazyLoadEvent): void {
        if (!this.paginationServeur) {
            return;
        }
        const taille = evenement.rows ?? this.lignesParPage;
        this.premier = evenement.first ?? 0;
        this.pageDemandee.emit({ page: Math.floor(this.premier / taille), taille, recherche: this.terme });
    }

    @ContentChildren(GabaritColonneDirective) private gabarits!: QueryList<GabaritColonneDirective>;

    private parNom = new Map<string, TemplateRef<unknown>>();

    ngAfterContentInit(): void {
        this.indexer();
        // Un écran peut déclarer ses gabarits sous condition : la carte se refait alors, sans quoi
        // la colonne retomberait silencieusement sur son rendu textuel.
        this.gabarits.changes.subscribe(() => this.indexer());
    }

    private indexer(): void {
        this.parNom = new Map(this.gabarits.map((g) => [g.nom, g.modele]));
    }

    protected gabarit(nom: string): TemplateRef<unknown> | undefined {
        return this.parNom.get(nom);
    }

    /** Le chemin est simple — « partenaire.code » n'est pas prévu : une telle colonne a un gabarit. */
    protected valeur(ligne: any, colonne: ColonneTableau): unknown {
        return colonne.champ ? ligne?.[colonne.champ] : '';
    }
}

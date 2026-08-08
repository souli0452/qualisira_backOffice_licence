import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { LicencesService } from '../services/licences.service';
import { ActionDeLigne, ColonneTableau, GabaritColonneDirective, TableauComponent } from '../shared';
import { ModuleVendable, OffreAbonnement } from '../models/licences.model';

/**
 * Le catalogue commercial : les formules qu'on propose.
 *
 * <p>Une offre est un <b>modèle de saisie</b>, pas une référence vivante : ses valeurs sont
 * recopiées dans la licence au moment de l'émission. C'est ce qui permet de faire évoluer le
 * catalogue sans rien changer à ce qui a déjà été vendu.</p>
 */
@Component({
    selector: 'app-offres',
    standalone: true,
    imports: [CommonModule, FormsModule, TableauComponent, GabaritColonneDirective, DialogModule, ButtonModule, InputTextModule,
        InputNumberModule, SelectModule, CheckboxModule, TagModule, TooltipModule],
    template: `
        <div class="entete">
            <div>
                <h1>Offres d'abonnement</h1>
                <p>Les formules proposées. Une offre est un modèle de saisie : ses valeurs sont
                   recopiées dans la licence à l'émission, la retoucher ne change rien à ce qui a
                   déjà été vendu.</p>
            </div>
            <p-button label="Nouvelle offre" icon="pi pi-plus" (onClick)="ouvrir()"></p-button>
        </div>

        <div class="carte">
            <app-tableau [lignes]="offres" [colonnes]="colonnes" [chargement]="chargement"
                         [actions]="actionsDeLOffre"
                         messageVide="Aucune offre au catalogue.">

                <ng-template gabaritColonne="offre" let-offre>
                    <div class="principal">{{ offre.libelle }}</div>
                    <div class="secondaire">
                        {{ offre.code }}{{ offre.montant != null ? ' · ' + montantLisible(offre) : ' · à négocier' }}
                    </div>
                </ng-template>

                <ng-template gabaritColonne="duree" let-offre>{{ offre.dureeMois }} mois</ng-template>

                <ng-template gabaritColonne="utilisateurs" let-offre>
                    {{ offre.utilisateursMax === 0 ? 'Sans limite' : offre.utilisateursMax }}
                </ng-template>

                <ng-template gabaritColonne="modules" let-offre>
                    <div style="display:flex;flex-wrap:wrap;gap:.25rem">
                        @for (module of offre.modules; track module) {
                            <p-tag severity="info" [value]="libelleModule(module)"></p-tag>
                        }
                    </div>
                </ng-template>

                <ng-template gabaritColonne="etat" let-offre>
                    <p-tag [severity]="offre.actif ? 'success' : 'secondary'"
                           [value]="offre.actif ? 'Proposée' : 'Retirée'"></p-tag>
                </ng-template>
            </app-tableau>
        </div>

        <p-dialog [header]="titreDuFormulaire"
                  [(visible)]="ouvert" [modal]="true" [style]="{ width: '52rem' }" [draggable]="false">
            @if (edite) {
                <div class="grille">
                    <div class="champ">
                        <label>Code <span class="requis">*</span></label>
                        <input pInputText [(ngModel)]="edite.code" [disabled]="!!edite.id"
                               placeholder="ESSENTIEL">
                    </div>
                    <div class="champ">
                        <label>Libellé <span class="requis">*</span></label>
                        <input pInputText [(ngModel)]="edite.libelle">
                    </div>
                    <div class="champ">
                        <label>Durée (mois) <span class="requis">*</span></label>
                        <p-inputnumber [(ngModel)]="edite.dureeMois" [min]="1"></p-inputnumber>
                    </div>
                    <div class="champ">
                        <label>Utilisateurs</label>
                        <p-inputnumber [(ngModel)]="edite.utilisateursMax" [min]="0"></p-inputnumber>
                        <span class="aide">0 vaut « sans limite ».</span>
                    </div>
                    <div class="champ">
                        <label>Montant</label>
                        <p-inputNumber [(ngModel)]="edite.montant" mode="decimal"
                                       [minFractionDigits]="0" [maxFractionDigits]="2"
                                       placeholder="1500000"></p-inputNumber>
                        <span class="aide">Recopié sur chaque licence au moment de l'émission, et
                            figé : réviser ce prix ne changera rien aux licences déjà émises.
                            Laissé vide, l'offre est « à négocier ».</span>
                    </div>
                    <div class="champ">
                        <label>Devise</label>
                        <p-select [(ngModel)]="edite.devise" [options]="devises"
                                  appendTo="body"></p-select>
                    </div>
                    <div class="champ">
                        <label>État</label>
                        <p-select [(ngModel)]="edite.actif" [options]="etats" optionLabel="libelle"
                                  optionValue="valeur" appendTo="body"></p-select>
                    </div>
                    <div class="champ pleine">
                        <label>Description</label>
                        <input pInputText [(ngModel)]="edite.description">
                    </div>
                    <div class="champ pleine">
                        <label>Modules inclus <span class="requis">*</span></label>
                        <div class="cases">
                            @for (module of modules; track module.code) {
                                <label class="case">
                                    <p-checkbox [(ngModel)]="edite.modules" [value]="module.code"
                                                [binary]="false"></p-checkbox>
                                    <span>
                                        <span class="titre">{{ module.libelle }}</span>
                                        <span class="detail">{{ module.description }}</span>
                                    </span>
                                </label>
                            }
                        </div>
                    </div>
                    <div class="pleine encart">
                        Modifier une offre ne change rien aux licences déjà émises : leurs modules
                        et leur durée y ont été recopiés au moment de l'émission.
                    </div>
                </div>
            }

            <ng-template pTemplate="footer">
                <p-button label="Annuler" severity="secondary" [text]="true"
                          (onClick)="ouvert = false"></p-button>
                <p-button label="Enregistrer" icon="pi pi-check" [loading]="enregistrement"
                          (onClick)="enregistrer()"></p-button>
            </ng-template>
        </p-dialog>
    `
})
export class OffresComponent implements OnInit {

    /**
     * Les devises proposées.
     *
     * <p>Une liste courte plutôt qu'un champ libre : « FCFA », « XOF » et « F CFA » désignent la
     * même monnaie et ne s'additionneraient pas entre elles.</p>
     */
    protected readonly devises = ['XOF', 'EUR', 'USD', 'XAF', 'MAD'];

    /** Le montant tel qu'on le lit — séparateurs de milliers, et la devise à côté. */
    protected montantLisible(offre: OffreAbonnement): string {
        if (offre.montant == null) {
            return 'à négocier';
        }
        return `${offre.montant.toLocaleString('fr-FR')} ${offre.devise}`;
    }


    protected readonly colonnes: ColonneTableau[] = [
        { entete: 'Offre', gabarit: 'offre' },
        { entete: 'Durée', gabarit: 'duree', largeur: '8rem' },
        { entete: 'Utilisateurs', gabarit: 'utilisateurs', largeur: '9rem' },
        { entete: 'Modules', gabarit: 'modules' },
        { entete: 'État', gabarit: 'etat', largeur: '8rem' }
    ];

    protected readonly actionsDeLOffre = (offre: OffreAbonnement): ActionDeLigne[] => [
        { libelle: 'Modifier', icone: 'pi pi-pencil', executer: () => this.ouvrir(offre) }
    ];


    private readonly service = inject(LicencesService);
    private readonly messages = inject(MessageService);

    offres: OffreAbonnement[] = [];
    modules: ModuleVendable[] = [];
    chargement = true;
    enregistrement = false;

    ouvert = false;
    edite?: OffreAbonnement;

    readonly etats = [
        { libelle: 'Proposée', valeur: true },
        { libelle: 'Retirée du catalogue', valeur: false }
    ];

    ngOnInit(): void {
        this.charger();
        this.service.modulesVendables().subscribe({ next: (m) => (this.modules = m), error: () => {} });
    }

    private charger(): void {
        this.chargement = true;
        this.service.offres().subscribe({
            next: (o) => {
                this.offres = o;
                this.chargement = false;
            },
            error: (e) => {
                this.chargement = false;
                this.erreur(e);
            }
        });
    }

    libelleModule(code: string): string {
        return this.modules.find((m) => m.code === code)?.libelle ?? code;
    }

    get titreDuFormulaire(): string {
        return this.edite?.id ? `Offre ${this.edite.libelle}` : 'Nouvelle offre';
    }

    ouvrir(offre?: OffreAbonnement): void {
        this.edite = offre
            ? { ...offre, modules: [...offre.modules] }
            : { code: '', libelle: '', dureeMois: 12, utilisateursMax: 25, modules: [], actif: true,
                montant: null, devise: 'XOF' };
        this.ouvert = true;
    }

    enregistrer(): void {
        if (!this.edite) return;
        this.enregistrement = true;

        const suite = this.edite.id
            ? this.service.modifierOffre(this.edite.id, this.edite)
            : this.service.creerOffre(this.edite);

        suite.subscribe({
            next: () => {
                this.enregistrement = false;
                this.ouvert = false;
                this.charger();
                this.messages.add({
                    severity: 'success',
                    summary: this.edite?.id ? 'Offre mise à jour' : 'Offre ajoutée au catalogue'
                });
            },
            error: (e) => {
                this.enregistrement = false;
                this.erreur(e);
            }
        });
    }

    private erreur(e: Error): void {
        this.messages.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 8000 });
    }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { ActionDeLigne, ColonneTableau, GabaritColonneDirective, TableauComponent } from '../shared';
import { LicencesService } from '../services/licences.service';
import { DemandeDePage, Licence, Partenaire, PartenaireVue } from '../models/licences.model';

/**
 * Le fichier des clients : qui ils sont, comment les joindre, et où en sont leurs licences.
 *
 * <p>Le code du partenaire est inscrit dans chaque licence émise. Le modifier invaliderait celles
 * déjà remises, sans que rien ici ne le signale — d'où le champ verrouillé à la modification.</p>
 */
@Component({
    selector: 'app-partenaires',
    standalone: true,
    imports: [CommonModule, FormsModule, TableauComponent, GabaritColonneDirective, DialogModule, ButtonModule, InputTextModule,
        SelectModule, TagModule, TextareaModule, TooltipModule],
    template: `
        <div class="entete">
            <div>
                <h1>Partenaires</h1>
                <p>Les organisations chez qui QualiSira est installé. Le code identifie le partenaire
                   dans ses licences : il ne se modifie plus une fois créé.</p>
            </div>
            <p-button label="Nouveau partenaire" icon="pi pi-plus" (onClick)="ouvrir()"></p-button>
        </div>

        <div class="carte">
            <app-tableau [lignes]="partenaires" [colonnes]="colonnes" [chargement]="chargement"
                         [actions]="actionsDuPartenaire"
                         [total]="total" (pageDemandee)="demanderLaPage($event)"
                         [recherche]="['code','raisonSociale','ville','contactNom']"
                         placeholderRecherche="Rechercher un partenaire…"
                         messageVide="Aucun partenaire enregistré. Créez-en un pour pouvoir émettre une licence.">

                <ng-template gabaritColonne="code" let-partenaire>
                    <p-tag severity="secondary" [value]="partenaire.code"></p-tag>
                </ng-template>

                <ng-template gabaritColonne="raisonSociale" let-partenaire>
                    <div class="principal">{{ partenaire.raisonSociale }}</div>
                    <div class="secondaire">
                        {{ partenaire.ville }}{{ partenaire.pays ? ' · ' + partenaire.pays : '' }}
                    </div>
                </ng-template>

                <ng-template gabaritColonne="contact" let-partenaire>
                    <div>{{ partenaire.contactNom || '—' }}</div>
                    <div class="secondaire">{{ partenaire.contactEmail }}</div>
                </ng-template>

                <ng-template gabaritColonne="licences" let-partenaire>
                    <div>{{ compter(partenaire) }}</div>
                    <div class="secondaire">{{ etatDesLicences(partenaire) }}</div>
                </ng-template>

                <ng-template gabaritColonne="etat" let-partenaire>
                    <p-tag [severity]="partenaire.actif ? 'success' : 'secondary'"
                           [value]="partenaire.actif ? 'Actif' : 'Inactif'"></p-tag>
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
                               placeholder="CHU-ABJ">
                        <span class="aide">
                            {{ edite.id ? 'Inscrit dans les licences émises : il ne se modifie plus.'
                                        : 'Majuscules, sans espace. Inscrit dans chaque licence.' }}
                        </span>
                    </div>
                    <div class="champ">
                        <label>Raison sociale <span class="requis">*</span></label>
                        <input pInputText [(ngModel)]="edite.raisonSociale">
                    </div>
                    <div class="champ">
                        <label>Sigle</label>
                        <input pInputText [(ngModel)]="edite.sigle">
                    </div>
                    <div class="champ">
                        <label>Secteur d'activité</label>
                        <input pInputText [(ngModel)]="edite.secteurActivite">
                    </div>
                    <div class="champ">
                        <label>Contact</label>
                        <input pInputText [(ngModel)]="edite.contactNom">
                    </div>
                    <div class="champ">
                        <label>Courriel</label>
                        <input pInputText type="email" [(ngModel)]="edite.contactEmail">
                        <span class="aide">Adresse proposée par défaut à l'envoi d'une licence.</span>
                    </div>
                    <div class="champ">
                        <label>Téléphone</label>
                        <input pInputText [(ngModel)]="edite.contactTelephone">
                    </div>
                    <div class="champ">
                        <label>Ville</label>
                        <input pInputText [(ngModel)]="edite.ville">
                    </div>
                    <div class="champ">
                        <label>Pays</label>
                        <input pInputText [(ngModel)]="edite.pays">
                    </div>
                    <div class="champ">
                        <label>État</label>
                        <p-select [(ngModel)]="edite.actif" [options]="etats" optionLabel="libelle"
                                  optionValue="valeur" appendTo="body"></p-select>
                        <span class="aide">Un partenaire inactif ne reçoit plus de nouvelle licence ;
                            celles déjà remises restent valables jusqu'à leur terme.</span>
                    </div>
                    <div class="champ pleine">
                        <label>Adresse</label>
                        <input pInputText [(ngModel)]="edite.adresse">
                    </div>
                    <div class="champ pleine">
                        <label>Notes</label>
                        <textarea pTextarea [(ngModel)]="edite.notes" rows="3"
                                  placeholder="Conditions négociées, interlocuteur, historique…"></textarea>
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
export class PartenairesComponent implements OnInit {

    protected readonly colonnes: ColonneTableau[] = [
        { entete: 'Code', gabarit: 'code', largeur: '8rem' },
        { entete: 'Raison sociale', gabarit: 'raisonSociale' },
        { entete: 'Contact', gabarit: 'contact' },
        { entete: 'Licences', gabarit: 'licences' },
        { entete: 'État', gabarit: 'etat', largeur: '7rem' }
    ];

    protected readonly actionsDuPartenaire = (partenaire: Partenaire): ActionDeLigne[] => [
        { libelle: 'Modifier', icone: 'pi pi-pencil', executer: () => this.ouvrir(partenaire) }
    ];


    private readonly service = inject(LicencesService);
    private readonly messages = inject(MessageService);

    partenaires: PartenaireVue[] = [];
    /** Nombre total de partenaires côté serveur — ce que la pagination affiche. */
    total = 0;
    private derniereDemande: DemandeDePage = { page: 0, taille: 10 };
    licences: Licence[] = [];
    chargement = true;
    enregistrement = false;

    ouvert = false;
    edite?: Partenaire;

    readonly etats = [
        { libelle: 'Actif', valeur: true },
        { libelle: 'Inactif', valeur: false }
    ];

    ngOnInit(): void {
        // Rien ici : le tableau réclame sa première page dès son affichage, avec la taille et la
        // recherche qu'il porte. La charger aussi d'ici ferait deux requêtes, dont une aveugle.
    }

    /** Réclamée par le tableau : première page, changement de page, ou recherche. */
    protected demanderLaPage(demande: DemandeDePage): void {
        this.derniereDemande = demande;
        this.charger();
    }

    private charger(): void {
        this.chargement = true;
        this.service.pagePartenaires(this.derniereDemande).subscribe({
            next: (page) => {
                this.partenaires = page.contenu;
                this.total = page.total;
                this.chargement = false;
            },
            error: (e) => {
                this.chargement = false;
                this.erreur(e);
            }
        });
    }

    /**
     * Le compte et l'échéance viennent désormais du serveur, calculés pour la page affichée.
     *
     * <p>Ils étaient déduits ici en parcourant toutes les licences — ce qui ne survit pas à la
     * pagination : le compte n'aurait plus porté que sur celles de la page chargée, et se serait
     * mis à baisser en tournant les pages sans que rien ne le signale.</p>
     */
    compter(partenaire: PartenaireVue): number {
        return partenaire.nbLicences;
    }

    etatDesLicences(partenaire: PartenaireVue): string {
        if (!partenaire.licenceActiveFin) {
            return 'aucune en cours';
        }
        return `active jusqu'au ${new Date(partenaire.licenceActiveFin).toLocaleDateString('fr-FR')}`;
    }

    get titreDuFormulaire(): string {
        return this.edite?.id ? `Partenaire ${this.edite.code}` : 'Nouveau partenaire';
    }

    ouvrir(partenaire?: Partenaire): void {
        this.edite = partenaire
            ? { ...partenaire }
            : { code: '', raisonSociale: '', actif: true };
        this.ouvert = true;
    }

    enregistrer(): void {
        if (!this.edite) return;
        this.enregistrement = true;

        const suite = this.edite.id
            ? this.service.modifierPartenaire(this.edite.id, this.edite)
            : this.service.creerPartenaire(this.edite);

        suite.subscribe({
            next: () => {
                this.enregistrement = false;
                this.ouvert = false;
                this.charger();
                this.messages.add({
                    severity: 'success',
                    summary: this.edite?.id ? 'Partenaire mis à jour' : 'Partenaire créé'
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

import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ActionDeLigne, ColonneTableau, GabaritColonneDirective, TableauComponent } from '../shared';
import { LicencesService } from '../services/licences.service';
import { SessionService } from '../services/session.service';
import {
    DemandeDePage,
    Licence,
    ModuleVendable,
    OffreAbonnement,
    Partenaire,
    StatutLicence
} from '../models/licences.model';

/**
 * Les licences émises, et l'émission d'une nouvelle.
 *
 * <p>Une licence ne se modifie pas : elle est signée à l'émission, et c'est le jeton qui fait foi
 * chez le partenaire. Prolonger un abonnement consiste donc à en émettre une nouvelle — d'où
 * l'absence de tout bouton « modifier » sur cet écran.</p>
 */
@Component({
    selector: 'app-licences',
    standalone: true,
    imports: [CommonModule, FormsModule, TableauComponent, GabaritColonneDirective, DialogModule, ButtonModule, InputTextModule,
        InputNumberModule, SelectModule, DatePickerModule, CheckboxModule, TagModule, TooltipModule],
    providers: [DatePipe],
    template: `
        <div class="entete">
            <div>
                <h1>Licences</h1>
                <p>Chaque licence est signée à l'émission et ne se modifie plus. Prolonger un
                   abonnement consiste à en émettre une nouvelle.</p>
            </div>
            <p-button label="Émettre une licence" icon="pi pi-plus" (onClick)="ouvrirEmission()"></p-button>
        </div>

        <div class="resume">
            <div class="tuile"><div class="nombre">{{ partenaires.length }}</div><div class="quoi">Partenaires</div></div>
            <div class="tuile"><div class="nombre">{{ nombreActives }}</div><div class="quoi">Licences actives</div></div>
            <div class="tuile"><div class="nombre">{{ nombreEcheances }}</div><div class="quoi">Échéances sous 30 jours</div></div>
            <div class="tuile"><div class="nombre">{{ nombreExpirees }}</div><div class="quoi">Expirées</div></div>
        </div>

        <div class="carte">
            <app-tableau [lignes]="licences" [colonnes]="colonnes" [chargement]="chargement"
                         [actions]="actionsDeLaLicence" largeurDesActions="4rem"
                         [total]="total" (pageDemandee)="demanderLaPage($event)"
                         [recherche]="['reference','partenaireNom','partenaireCode','offre']"
                         placeholderRecherche="Rechercher une licence…"
                         messageVide="Aucune licence émise pour l'instant.">

                <ng-template gabaritColonne="reference" let-licence>
                    <div class="principal">{{ licence.reference }}</div>
                    @if (licence.type === 'ESSAI') {
                        <p-tag severity="warn" value="Essai"></p-tag>
                    }
                </ng-template>

                <ng-template gabaritColonne="partenaire" let-licence>
                    <div class="principal">{{ licence.partenaireNom }}</div>
                    <div class="secondaire">{{ licence.partenaireCode }}</div>
                </ng-template>

                <ng-template gabaritColonne="offre" let-licence>
                    <div>{{ licence.offre }}</div>
                    <div class="secondaire">
                        {{ licence.modules.length }} module(s) ·
                        {{ licence.utilisateursMax === 0 ? 'utilisateurs illimités' : licence.utilisateursMax + ' utilisateurs' }}
                    </div>
                </ng-template>

                <ng-template gabaritColonne="periode" let-licence>
                    <div>{{ licence.debut | date: 'dd/MM/yyyy' }} → {{ licence.fin | date: 'dd/MM/yyyy' }}</div>
                    @if (licence.statut === 'ACTIVE') {
                        <div class="secondaire">{{ licence.joursRestants }} jours restants</div>
                    } @else if (licence.statut === 'EXPIREE') {
                        <div class="secondaire">depuis {{ -licence.joursRestants }} j</div>
                    }
                </ng-template>

                <ng-template gabaritColonne="etat" let-licence>
                    <p-tag [severity]="severite(licence.statut)" [value]="libelleStatut(licence.statut)"></p-tag>
                    <!-- Une licence émise mais jamais remise ne sert à personne : c'est l'oubli
                         qu'on découvre quand le client appelle. -->
                    @if (!licence.envoyeeLe) {
                        <div class="secondaire" style="margin-top:.25rem">non envoyée</div>
                    }
                </ng-template>
            </app-tableau>
        </div>

        <!-- ============================================================ émission -->
        <p-dialog header="Émettre une licence" [(visible)]="emissionOuverte" [modal]="true"
                  [style]="{ width: '52rem' }" [draggable]="false">
            <div class="grille">
                <div class="champ">
                    <label>Partenaire <span class="requis">*</span></label>
                    <p-select [(ngModel)]="demande.partenaireId" [options]="partenairesActifs"
                              optionLabel="libelle" optionValue="id" [filter]="true"
                              placeholder="Choisir un partenaire" appendTo="body"></p-select>
                </div>
                <div class="champ">
                    <label>Offre</label>
                    <p-select [(ngModel)]="demande.offreId" [options]="offresProposables"
                              optionLabel="libelle" optionValue="id" [filter]="true"
                              placeholder="Sur mesure…" [showClear]="true"
                              (onChange)="appliquerOffre()" appendTo="body"></p-select>
                </div>
                <div class="champ">
                    <label>Date de début</label>
                    <p-datepicker [(ngModel)]="debut" dateFormat="dd/mm/yy" [showIcon]="true"
                                  appendTo="body"></p-datepicker>
                </div>
                <div class="champ">
                    <label>Durée (mois)</label>
                    <p-inputnumber [(ngModel)]="demande.dureeMois" [min]="1" [showButtons]="false"
                                   [placeholder]="placeholderDuree"></p-inputnumber>
                    <span class="aide">Laissez vide pour suivre l'offre.</span>
                </div>
                <div class="champ">
                    <label>Utilisateurs</label>
                    <p-inputnumber [(ngModel)]="demande.utilisateursMax" [min]="0"
                                   [placeholder]="placeholderUtilisateurs"></p-inputnumber>
                    <span class="aide">0 vaut « sans limite ».</span>
                </div>
                <div class="champ pleine">
                    <label>Modules ouverts</label>
                    <div class="cases">
                        @for (module of modules; track module.code) {
                            <label class="case">
                                <p-checkbox [(ngModel)]="modulesChoisis" [value]="module.code"
                                            [binary]="false"></p-checkbox>
                                <span>
                                    <span class="titre">{{ module.libelle }}</span>
                                    <span class="detail">{{ module.description }}</span>
                                </span>
                            </label>
                        }
                    </div>
                    <span class="aide">Cochés depuis l'offre choisie ; modifiez-les pour une licence sur mesure.</span>
                </div>
            </div>

            <ng-template pTemplate="footer">
                @if (offreDEssai(); as essai) {
                    <p-button [label]="'Offrir un essai (' + dureeDe(essai) + ')'"
                              severity="secondary" [outlined]="true"
                              (onClick)="offrirEssai(essai)"></p-button>
                }
                <p-button label="Annuler" severity="secondary" [text]="true"
                          (onClick)="emissionOuverte = false"></p-button>
                <p-button label="Émettre la licence" icon="pi pi-check" [loading]="enregistrement"
                          (onClick)="emettre()"></p-button>
            </ng-template>
        </p-dialog>

        <!-- ============================================================ détail -->
        <p-dialog [header]="'Licence ' + (choisie?.reference || '')" [(visible)]="detailOuvert"
                  [modal]="true" [style]="{ width: '52rem' }" [draggable]="false">
            @if (choisie) {
                <div class="grille">
                    <div class="champ">
                        <label>Partenaire</label>
                        <div class="principal">{{ choisie.partenaireNom }}</div>
                        <div class="secondaire">{{ choisie.partenaireCode }}</div>
                    </div>
                    <div class="champ"><label>Offre</label><div>{{ choisie.offre }}</div></div>
                    <div class="champ">
                        <label>Période</label>
                        <div>{{ choisie.debut | date: 'dd/MM/yyyy' }} → {{ choisie.fin | date: 'dd/MM/yyyy' }}</div>
                    </div>
                    <div class="champ">
                        <label>État</label>
                        <div><p-tag [severity]="severite(choisie.statut)" [value]="libelleStatut(choisie.statut)"></p-tag></div>
                    </div>
                    <div class="champ">
                        <label>Utilisateurs</label>
                        <div>{{ choisie.utilisateursMax === 0 ? 'Sans limite' : choisie.utilisateursMax }}</div>
                    </div>
                    <div class="champ">
                        <label>Émise le</label>
                        <div>{{ choisie.emiseLe | date: 'dd/MM/yyyy' }} par {{ choisie.emisePar }}</div>
                    </div>
                    <div class="champ pleine">
                        <label>Modules ouverts</label>
                        <div style="display:flex;flex-wrap:wrap;gap:.25rem">
                            @for (module of choisie.modules; track module) {
                                <p-tag severity="info" [value]="libelleModule(module)"></p-tag>
                            }
                        </div>
                    </div>
                    <div class="champ pleine">
                        <label>Remise au partenaire</label>
                        @if (choisie.envoyeeLe) {
                            <div>
                                <p-tag severity="success" value="Envoyée"></p-tag>
                                le {{ choisie.envoyeeLe | date: 'dd/MM/yyyy à HH:mm' }} à {{ choisie.envoyeeA }}
                            </div>
                        } @else {
                            <div><p-tag severity="secondary" value="Pas encore envoyée"></p-tag></div>
                        }
                    </div>
                    @if (choisie.motifRevocation) {
                        <div class="champ pleine">
                            <label>Motif de révocation</label>
                            <div>{{ choisie.motifRevocation }}</div>
                        </div>
                    }
                    <div class="champ pleine">
                        <label>Licence à remettre au partenaire</label>
                        <div class="jeton">{{ choisie.jeton }}</div>
                        <span class="aide">L'administrateur du partenaire colle ce texte au premier
                            démarrage de QualiSira. Le fichier .lic évite les coupures de ligne des
                            messageries.</span>
                    </div>
                </div>
            }

            <ng-template pTemplate="footer">
                @if (choisie && choisie.statut !== 'REVOQUEE') {
                    <p-button label="Révoquer" severity="danger" [text]="true"
                              (onClick)="revoquer()"></p-button>
                }
                <p-button label="Télécharger le .lic" icon="pi pi-download" severity="secondary"
                          [outlined]="true" (onClick)="telecharger()"></p-button>
                <p-button label="Copier" icon="pi pi-copy" severity="secondary" [outlined]="true"
                          (onClick)="copier()"></p-button>
                <p-button [label]="choisie?.envoyeeLe ? 'Renvoyer par courriel' : 'Envoyer par courriel'"
                          icon="pi pi-send" [loading]="envoiEnCours" (onClick)="ouvrirEnvoi()"></p-button>
            </ng-template>
        </p-dialog>

        <!-- ============================================================ envoi -->
        <p-dialog header="Envoyer la licence" [(visible)]="envoiOuvert" [modal]="true"
                  [style]="{ width: '30rem' }" [draggable]="false">
            <div class="champ">
                <label>Adresse du destinataire</label>
                <input pInputText [(ngModel)]="destinataire" placeholder="informatique@partenaire.ci">
                <span class="aide">Le fichier .lic est joint au message. L'adresse du contact est
                    proposée ; l'informaticien qui installe n'est pas toujours l'interlocuteur
                    commercial.</span>
            </div>
            <ng-template pTemplate="footer">
                <p-button label="Annuler" severity="secondary" [text]="true"
                          (onClick)="envoiOuvert = false"></p-button>
                <p-button label="Envoyer" icon="pi pi-send" [loading]="envoiEnCours"
                          (onClick)="envoyer()"></p-button>
            </ng-template>
        </p-dialog>
    `
})
export class LicencesComponent implements OnInit {

    protected readonly colonnes: ColonneTableau[] = [
        { entete: 'Référence', gabarit: 'reference', largeur: '11rem' },
        { entete: 'Partenaire', gabarit: 'partenaire' },
        { entete: 'Offre', gabarit: 'offre' },
        { entete: 'Période', gabarit: 'periode' },
        { entete: 'État', gabarit: 'etat', largeur: '9rem' }
    ];

    /**
     * Ce qu'on peut faire d'une licence, depuis la ligne même.
     *
     * <p>Ces gestes n'étaient atteignables qu'après avoir ouvert la fiche : renvoyer une licence à
     * un client qui ne l'a pas reçue demandait trois clics et de savoir où regarder. Ils opèrent
     * sur la licence désignée, que l'on retient d'abord — c'est elle que lisent ensuite les
     * méthodes de la fiche.</p>
     */
    protected readonly actionsDeLaLicence = (licence: Licence): ActionDeLigne[] => [
        { libelle: 'Voir le détail', icone: 'pi pi-eye', executer: () => this.voir(licence) },
        {
            libelle: licence.envoyeeLe ? 'Renvoyer par courriel' : 'Envoyer par courriel',
            icone: 'pi pi-send',
            visible: this.session.peut('LICENCE_ENVOYER') && licence.statut !== 'REVOQUEE',
            executer: () => { this.choisie = licence; this.ouvrirEnvoi(); }
        },
        {
            libelle: 'Télécharger le fichier',
            icone: 'pi pi-download',
            executer: () => { this.choisie = licence; this.telecharger(); }
        },
        {
            libelle: 'Révoquer',
            icone: 'pi pi-ban',
            danger: true,
            visible: this.session.peut('LICENCE_REVOQUER') && licence.statut !== 'REVOQUEE',
            executer: () => { this.choisie = licence; this.revoquer(); }
        }
    ];


    private readonly service = inject(LicencesService);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);
    protected readonly session = inject(SessionService);

    licences: Licence[] = [];
    partenaires: Partenaire[] = [];
    /** Nombre total de licences côté serveur — ce que la pagination affiche. */
    total = 0;
    private derniereDemande: DemandeDePage = { page: 0, taille: 10 };
    offres: OffreAbonnement[] = [];
    modules: ModuleVendable[] = [];

    chargement = true;
    enregistrement = false;
    envoiEnCours = false;

    emissionOuverte = false;
    detailOuvert = false;
    envoiOuvert = false;

    choisie?: Licence;
    destinataire = '';

    demande: {
        partenaireId?: string;
        offreId?: string | null;
        dureeMois?: number | null;
        utilisateursMax?: number | null;
    } = {};
    debut: Date = new Date();
    modulesChoisis: string[] = [];

    placeholderDuree = "celle de l'offre";
    placeholderUtilisateurs = "celui de l'offre";

    ngOnInit(): void {
        // La première page de licences n'est pas chargée ici : le tableau la réclame lui-même,
        // avec la taille et la recherche qu'il porte. Le reste — partenaires, offres, modules —
        // alimente le formulaire d'émission et ne se pagine pas.
        this.chargerLesReferentiels();
    }

    /** Réclamée par le tableau : première page, changement de page, ou recherche. */
    protected demanderLaPage(demande: DemandeDePage): void {
        this.derniereDemande = demande;
        this.charger();
    }

    private charger(): void {
        this.chargement = true;
        this.service.licences(this.derniereDemande).subscribe({
            next: (page) => {
                this.licences = page.contenu;
                this.total = page.total;
                this.chargement = false;
            },
            error: (e) => {
                this.chargement = false;
                this.erreur(e);
            }
        });
    }

    private chargerLesReferentiels(): void {
        this.service.partenaires().subscribe({ next: (p) => (this.partenaires = p), error: () => {} });
        this.service.offres().subscribe({ next: (o) => (this.offres = o), error: () => {} });
        this.service.modulesVendables().subscribe({ next: (m) => (this.modules = m), error: () => {} });
    }

    // ------------------------------------------------------------ tableau

    get nombreActives(): number {
        return this.licences.filter((l) => l.statut === 'ACTIVE').length;
    }

    get nombreEcheances(): number {
        return this.licences.filter((l) => l.statut === 'ACTIVE' && l.joursRestants <= 30).length;
    }

    get nombreExpirees(): number {
        return this.licences.filter((l) => l.statut === 'EXPIREE').length;
    }

    severite(statut: StatutLicence): 'success' | 'info' | 'danger' | 'secondary' {
        switch (statut) {
            case 'ACTIVE': return 'success';
            case 'A_VENIR': return 'info';
            case 'EXPIREE': return 'danger';
            default: return 'secondary';
        }
    }

    libelleStatut(statut: StatutLicence): string {
        switch (statut) {
            case 'ACTIVE': return 'Active';
            case 'A_VENIR': return 'À venir';
            case 'EXPIREE': return 'Expirée';
            default: return 'Révoquée';
        }
    }

    libelleModule(code: string): string {
        return this.modules.find((m) => m.code === code)?.libelle ?? code;
    }

    /** Les listes déroulantes veulent un libellé tout fait : PrimeNG ne compose pas de champs. */
    get partenairesActifs(): { id: string; libelle: string }[] {
        return this.partenaires
            .filter((p) => p.actif)
            .map((p) => ({ id: p.id!, libelle: `${p.raisonSociale} (${p.code})` }));
    }

    get offresProposables(): { id: string; libelle: string }[] {
        return this.offres
            .filter((o) => o.actif)
            .map((o) => ({
                id: o.id!,
                libelle: `${o.libelle} — ${o.duree} ${o.uniteDuree === 'JOURS' ? 'j' : 'mois'}`
            }));
    }

    // ------------------------------------------------------------ émission

    ouvrirEmission(): void {
        if (this.partenaires.length === 0) {
            this.messages.add({
                severity: 'info',
                summary: 'Aucun partenaire',
                detail: "Créez d'abord un partenaire : une licence est toujours émise pour quelqu'un.",
                life: 6000
            });
            return;
        }
        this.demande = {
            partenaireId: this.partenairesActifs[0]?.id,
            offreId: this.offresProposables[0]?.id ?? null,
            dureeMois: null,
            utilisateursMax: null
        };
        this.debut = new Date();
        this.appliquerOffre();
        this.emissionOuverte = true;
    }

    /** Les valeurs de l'offre garnissent le formulaire : on ne ressaisit que les écarts. */
    appliquerOffre(): void {
        const offre = this.offres.find((o) => o.id === this.demande.offreId);
        this.modulesChoisis = offre ? [...offre.modules] : [];
        this.placeholderDuree = offre
            ? `${offre.duree} ${offre.uniteDuree === 'JOURS' ? 'jours' : 'mois'} (offre)`
            : 'obligatoire';
        this.placeholderUtilisateurs = offre
            ? `${offre.utilisateursMax === 0 ? 'sans limite' : offre.utilisateursMax} (offre)`
            : '0 = sans limite';
    }

    emettre(): void {
        this.enregistrement = true;
        this.service.emettre({
            partenaireId: this.demande.partenaireId!,
            offreId: this.demande.offreId ?? null,
            debut: this.enIso(this.debut),
            dureeMois: this.demande.dureeMois ?? null,
            utilisateursMax: this.demande.utilisateursMax ?? null,
            modules: this.modulesChoisis
        }).subscribe({
            next: (licence) => {
                this.enregistrement = false;
                this.emissionOuverte = false;
                this.charger();
                this.choisie = licence;
                this.detailOuvert = true;
                this.messages.add({
                    severity: 'success',
                    summary: `Licence ${licence.reference} émise`,
                    detail: 'Transmettez-la au partenaire.'
                });
            },
            error: (e) => {
                this.enregistrement = false;
                this.erreur(e);
            }
        });
    }

    /**
     * L'offre d'essai du catalogue, s'il y en a une.
     *
     * <p>Le bouton n'apparaît que si elle existe : proposer un essai qu'aucune offre ne décrit
     * mènerait à un refus que rien n'expliquerait.</p>
     */
    protected offreDEssai(): OffreAbonnement | undefined {
        return this.offres.find((o) => o.essai && o.actif);
    }

    protected dureeDe(offre: OffreAbonnement): string {
        return `${offre.duree} ${offre.uniteDuree === 'JOURS' ? 'j' : 'mois'}`;
    }

    /**
     * Offre un essai — en émettant sur l'offre d'essai, comme n'importe quelle autre licence.
     *
     * <p>Il existait un chemin à part pour cela, dont la durée venait d'une variable
     * d'environnement et les modules d'une liste écrite dans le code. Rien ne s'y réglait sans
     * livrer une version, et l'on ne savait pas ce qui avait été accordé au prospect précédent.
     * Tout vient désormais du catalogue, et le serveur reste seul juge du « un par
     * partenaire ».</p>
     */
    offrirEssai(essai: OffreAbonnement): void {
        if (!this.demande.partenaireId) {
            return;
        }
        this.enregistrement = true;
        this.service.emettre({ partenaireId: this.demande.partenaireId, offreId: essai.id! }).subscribe({
            next: (licence) => {
                this.enregistrement = false;
                this.emissionOuverte = false;
                this.charger();
                this.choisie = licence;
                this.detailOuvert = true;
                this.messages.add({
                    severity: 'success',
                    summary: `Essai accordé (${licence.reference})`,
                    detail: `${this.dureeDe(essai)} — ${essai.modules.length} module(s), selon l'offre « ${essai.libelle} ».`
                });
            },
            error: (e) => {
                this.enregistrement = false;
                this.erreur(e);
            }
        });
    }

    // ------------------------------------------------------------ détail

    voir(licence: Licence): void {
        this.choisie = licence;
        this.detailOuvert = true;
    }

    telecharger(): void {
        if (this.choisie) {
            window.location.href = this.service.adresseDuFichier(this.choisie.id);
        }
    }

    async copier(): Promise<void> {
        if (!this.choisie) return;
        try {
            await navigator.clipboard.writeText(this.choisie.jeton);
            this.messages.add({ severity: 'success', summary: 'Copié dans le presse-papiers' });
        } catch {
            // Le presse-papiers est refusé hors HTTPS par certains navigateurs : le dire plutôt
            // que d'échouer en silence, la copie manuelle reste possible.
            this.messages.add({
                severity: 'warn',
                summary: 'Copie automatique refusée',
                detail: 'Sélectionnez le texte de la licence à la main.'
            });
        }
    }

    revoquer(): void {
        if (!this.choisie) return;
        const licence = this.choisie;
        this.confirmation.confirm({
            header: 'Révoquer cette licence ?',
            message: `« ${licence.reference} » sera marquée révoquée. Attention : l'installation du `
                + `partenaire fonctionne hors ligne et ne s'en apercevra pas — la révocation vaut `
                + `pour notre suivi.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Révoquer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                const motif = prompt("Motif (contrat résilié, impayé, erreur d'émission…) :") ?? '';
                this.service.revoquer(licence.id, motif).subscribe({
                    next: () => {
                        this.detailOuvert = false;
                        this.charger();
                        this.messages.add({ severity: 'success', summary: 'Licence révoquée' });
                    },
                    error: (e) => this.erreur(e)
                });
            }
        });
    }

    // ------------------------------------------------------------ envoi

    ouvrirEnvoi(): void {
        if (!this.choisie) return;
        const partenaire = this.partenaires.find((p) => p.id === this.choisie!.partenaireId);
        this.destinataire = this.choisie.envoyeeA || partenaire?.contactEmail || '';
        this.envoiOuvert = true;
    }

    envoyer(): void {
        if (!this.choisie) return;
        this.envoiEnCours = true;
        this.service.envoyer(this.choisie.id, this.destinataire).subscribe({
            next: (licence) => {
                this.envoiEnCours = false;
                this.envoiOuvert = false;
                this.choisie = licence;
                this.charger();
                this.messages.add({
                    severity: 'success',
                    summary: 'Licence envoyée',
                    detail: `${licence.reference} a été transmise à ${licence.envoyeeA}.`
                });
            },
            error: (e) => {
                this.envoiEnCours = false;
                this.erreur(e);
            }
        });
    }

    // ------------------------------------------------------------ divers

    /** Le serveur attend « 2026-08-08 » ; le fuseau du navigateur décalerait un ISO complet. */
    private enIso(date: Date): string {
        const mois = String(date.getMonth() + 1).padStart(2, '0');
        const jour = String(date.getDate()).padStart(2, '0');
        return `${date.getFullYear()}-${mois}-${jour}`;
    }

    private erreur(e: Error): void {
        this.messages.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 8000 });
    }
}

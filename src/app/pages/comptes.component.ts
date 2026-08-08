import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ActionDeLigne, ColonneTableau, GabaritColonneDirective, TableauComponent } from '../shared';
import { ComptesService } from '../services/comptes.service';
import { SessionService } from '../services/session.service';
import { DemandeDeCompte, DemandeDePage, Role, Utilisateur } from '../models/licences.model';

/**
 * Les comptes du back-office — l'écran du super administrateur.
 *
 * <p>Un compte n'ouvre rien par lui-même : ce sont ses <b>rôles</b> qui portent les permissions.
 * La colonne « ouvre » montre donc le nombre de permissions réunies, et la fiche les détaille —
 * sans quoi il faudrait ouvrir l'écran des rôles pour savoir ce qu'on vient d'accorder.</p>
 *
 * <p>Le mot de passe n'est jamais affiché deux fois : celui que le serveur tire au hasard n'est
 * lisible que dans la réponse à sa création, d'où la fenêtre qui le montre une fois, à recopier
 * avant de fermer.</p>
 */
@Component({
    selector: 'app-comptes',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
        MultiSelectModule, SelectModule, TagModule, TooltipModule,
        TableauComponent, GabaritColonneDirective],
    template: `
        <div class="entete">
            <div>
                <h1>Comptes</h1>
                <p>Qui entre dans cet outil, et avec quels rôles. Un compte sans rôle n'ouvre rien ;
                   les permissions viennent des rôles, jamais du compte lui-même.</p>
            </div>
            @if (session.peut('UTILISATEUR_CREER')) {
                <p-button label="Nouveau compte" icon="pi pi-user-plus" (onClick)="ouvrir()"></p-button>
            }
        </div>

        <div class="carte">
            <app-tableau [lignes]="comptes" [colonnes]="colonnes" [chargement]="chargement"
                         [actions]="actionsDuCompte" [seuilDesActions]="2"
                         largeurDesActions="4rem"
                         [total]="total" (pageDemandee)="demanderLaPage($event)"
                         [recherche]="['identifiant','nomComplet','email']"
                         placeholderRecherche="Rechercher un compte…"
                         messageVide="Aucun compte. Créez-en un pour ouvrir l'outil à quelqu'un d'autre que vous.">

                <ng-template gabaritColonne="identifiant" let-compte>
                    <div class="principal">
                        {{ compte.identifiant }}
                        @if (compte.identifiant === session.session()?.utilisateur) {
                            <span class="secondaire">— vous</span>
                        }
                    </div>
                    <div class="secondaire">
                        {{ compte.nomComplet || '—' }}{{ compte.email ? ' · ' + compte.email : '' }}
                    </div>
                </ng-template>

                <ng-template gabaritColonne="roles" let-compte>
                    @for (role of compte.roles; track role) {
                        <p-tag [severity]="role === 'SUPER_ADMIN' ? 'danger' : 'secondary'"
                               [value]="libelleDuRole(role)" styleClass="etiquette-role"></p-tag>
                    }
                </ng-template>

                <ng-template gabaritColonne="ouvre" let-compte>
                    <div>{{ compte.permissions.length }} permission(s)</div>
                    <div class="secondaire" [pTooltip]="compte.permissions.join(', ')"
                         tooltipPosition="top">
                        {{ compte.permissions.slice(0, 3).join(', ') }}{{ compte.permissions.length > 3 ? '…' : '' }}
                    </div>
                </ng-template>

                <ng-template gabaritColonne="connexion" let-compte>
                    <div>{{ compte.derniereConnexion ? (compte.derniereConnexion | date:'dd/MM/yyyy HH:mm') : 'jamais' }}</div>
                    <div class="secondaire">créé par {{ compte.creePar || '—' }}</div>
                </ng-template>

                <ng-template gabaritColonne="etat" let-compte>
                    <p-tag [severity]="compte.actif ? 'success' : 'secondary'"
                           [value]="compte.actif ? 'Actif' : 'Suspendu'"></p-tag>
                    @if (compte.doitChangerMotDePasse) {
                        <div class="secondaire">mot de passe provisoire</div>
                    }
                </ng-template>
            </app-tableau>
        </div>

        <p-dialog [header]="titreDuFormulaire" [(visible)]="ouvert" [modal]="true"
                  [style]="{ width: '48rem' }" [draggable]="false">
            @if (edite) {
                <div class="grille">
                    <div class="champ">
                        <label>Identifiant <span class="requis">*</span></label>
                        <input pInputText [(ngModel)]="edite.identifiant" [disabled]="!!enCoursId"
                               placeholder="p.kouadio" autocomplete="off">
                        <span class="aide">
                            {{ enCoursId ? "Inscrit dans « émise par » sur les licences déjà signées : il ne se modifie plus."
                                         : 'Lettres, chiffres, points ou tirets. Sans espace ni accent.' }}
                        </span>
                    </div>
                    <div class="champ">
                        <label>Nom complet</label>
                        <input pInputText [(ngModel)]="edite.nomComplet" placeholder="Pauline Kouadio">
                    </div>
                    <div class="champ">
                        <label>Courriel</label>
                        <input pInputText type="email" [(ngModel)]="edite.email">
                    </div>
                    <div class="champ">
                        <label>État</label>
                        <p-select [(ngModel)]="edite.actif" [options]="etats" optionLabel="libelle"
                                  optionValue="valeur" appendTo="body"></p-select>
                        <span class="aide">Un compte suspendu ne peut plus ouvrir de session ; son
                            nom reste lisible sur les licences qu'il a émises.</span>
                    </div>
                    <div class="champ pleine">
                        <label>Rôles <span class="requis">*</span></label>
                        <p-multiSelect [(ngModel)]="edite.roles" [options]="roles" optionLabel="libelle"
                                       optionValue="code" appendTo="body" display="chip"
                                       placeholder="Choisir un ou plusieurs rôles"></p-multiSelect>
                        <span class="aide">{{ resumeDesPermissions() }}</span>
                    </div>
                    @if (!enCoursId) {
                        <div class="champ pleine">
                            <label>Mot de passe</label>
                            <input pInputText type="text" [(ngModel)]="edite.motDePasse"
                                   placeholder="Laisser vide : le serveur en tire un au hasard"
                                   autocomplete="new-password">
                            <span class="aide">Huit caractères au moins. Laissé vide, un mot de passe
                                est tiré au hasard et affiché une seule fois — à transmettre à son
                                titulaire, qui devra le changer.</span>
                        </div>
                    }
                </div>
            }

            <ng-template pTemplate="footer">
                <p-button label="Annuler" severity="secondary" [text]="true"
                          (onClick)="ouvert = false"></p-button>
                <p-button label="Enregistrer" icon="pi pi-check" [loading]="enregistrement"
                          (onClick)="enregistrer()"></p-button>
            </ng-template>
        </p-dialog>

        <!-- Le mot de passe tiré au hasard n'existe que dans cette réponse : la base n'en garde
             que l'empreinte. Fermée sans être recopié, il faut le réinitialiser. -->
        <p-dialog header="Mot de passe provisoire" [(visible)]="motDePasseVisible" [modal]="true"
                  [style]="{ width: '30rem' }" [draggable]="false">
            <p class="secondaire" style="margin-top:0">
                Transmettez-le à <strong>{{ compteConcerne }}</strong>. Il n'est affiché qu'ici :
                fermée cette fenêtre, il faudra le réinitialiser. Son titulaire devra le changer à
                la première connexion.
            </p>
            <div class="jeton">{{ motDePasseProvisoire }}</div>
            <ng-template pTemplate="footer">
                <p-button label="Copier" icon="pi pi-copy" [text]="true"
                          (onClick)="copier()"></p-button>
                <p-button label="J'ai noté" icon="pi pi-check"
                          (onClick)="motDePasseVisible = false"></p-button>
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        :host ::ng-deep .etiquette-role { margin-right: .25rem; }
    `]
})
export class ComptesComponent implements OnInit {

    private readonly service = inject(ComptesService);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);
    protected readonly session = inject(SessionService);

    comptes: Utilisateur[] = [];
    /** Nombre total de comptes côté serveur — ce que la pagination affiche. */
    total = 0;
    private derniereDemande: DemandeDePage = { page: 0, taille: 10 };
    roles: Role[] = [];
    chargement = true;
    enregistrement = false;

    protected readonly colonnes: ColonneTableau[] = [
        { entete: 'Identifiant', gabarit: 'identifiant' },
        { entete: 'Rôles', gabarit: 'roles' },
        { entete: 'Ouvre', gabarit: 'ouvre' },
        { entete: 'Dernière connexion', gabarit: 'connexion' },
        { entete: 'État', gabarit: 'etat' }
    ];

    /**
     * Ce qu'on peut faire d'un compte.
     *
     * <p>Quatre actions au plus : elles passent donc sous les trois points, où chacune porte son
     * nom. Alignées en icônes, « suspendre » et « supprimer » se ressemblaient assez pour qu'on
     * clique l'une pour l'autre.</p>
     *
     * <p>Une fonction fléchée, et non une méthode : elle est passée au tableau comme valeur, et
     * une méthode ordinaire y perdrait son {@code this}.</p>
     */
    protected readonly actionsDuCompte = (compte: Utilisateur): ActionDeLigne[] => [
        {
            libelle: 'Modifier',
            icone: 'pi pi-pencil',
            visible: this.session.peut('UTILISATEUR_MODIFIER'),
            executer: () => this.ouvrir(compte)
        },
        {
            libelle: compte.actif ? 'Suspendre' : 'Rétablir',
            icone: compte.actif ? 'pi pi-ban' : 'pi pi-check-circle',
            visible: this.session.peut('UTILISATEUR_MODIFIER'),
            executer: () => this.basculer(compte)
        },
        {
            libelle: 'Réinitialiser le mot de passe',
            icone: 'pi pi-key',
            visible: this.session.peut('UTILISATEUR_MOT_DE_PASSE'),
            executer: () => this.reinitialiser(compte)
        },
        {
            libelle: 'Supprimer',
            icone: 'pi pi-trash',
            danger: true,
            visible: this.session.peut('UTILISATEUR_SUPPRIMER'),
            executer: () => this.supprimer(compte)
        }
    ];

    ouvert = false;
    edite?: DemandeDeCompte;
    enCoursId?: string;

    motDePasseVisible = false;
    motDePasseProvisoire = '';
    compteConcerne = '';

    readonly etats = [
        { libelle: 'Actif', valeur: true },
        { libelle: 'Suspendu', valeur: false }
    ];

    ngOnInit(): void {
        // La première page n'est pas chargée ici : le tableau la réclame lui-même dès son
        // affichage, avec la taille et la recherche qu'il porte. La charger aussi d'ici ferait
        // deux requêtes, dont une avec des critères que le tableau ignore.
        this.service.roles().subscribe({ next: (r) => (this.roles = r), error: () => {} });
    }

    /** Réclamée par le tableau : première page, changement de page, ou recherche. */
    protected demanderLaPage(demande: DemandeDePage): void {
        this.derniereDemande = demande;
        this.charger();
    }

    private charger(): void {
        this.chargement = true;
        this.service.comptes(this.derniereDemande).subscribe({
            next: (page) => {
                this.comptes = page.contenu;
                this.total = page.total;
                this.chargement = false;
            },
            error: (e) => {
                this.chargement = false;
                this.erreur(e);
            }
        });
    }

    libelleDuRole(code: string): string {
        return this.roles.find((role) => role.code === code)?.libelle ?? code;
    }

    /** Ce que les rôles cochés ouvrent, réuni — la question qu'on se pose avant d'enregistrer. */
    resumeDesPermissions(): string {
        const choisis = this.edite?.roles ?? [];
        if (!choisis.length) {
            return "Aucun rôle : ce compte pourra se connecter, et rien faire.";
        }
        const reunies = new Set<string>();
        choisis.forEach((code) => this.roles.find((role) => role.code === code)
            ?.permissions.forEach((permission) => reunies.add(permission)));
        return `${reunies.size} permission(s) au total.`;
    }

    get titreDuFormulaire(): string {
        return this.enCoursId ? `Compte ${this.edite?.identifiant}` : 'Nouveau compte';
    }

    ouvrir(compte?: Utilisateur): void {
        this.enCoursId = compte?.id;
        this.edite = compte
            ? {
                identifiant: compte.identifiant,
                nomComplet: compte.nomComplet,
                email: compte.email,
                roles: [...compte.roles],
                actif: compte.actif
            }
            : { identifiant: '', roles: [], actif: true, motDePasse: '' };
        this.ouvert = true;
    }

    enregistrer(): void {
        if (!this.edite) return;
        this.enregistrement = true;

        if (this.enCoursId) {
            this.service.modifierCompte(this.enCoursId, this.edite).subscribe({
                next: () => {
                    this.enregistrement = false;
                    this.ouvert = false;
                    this.charger();
                    this.messages.add({ severity: 'success', summary: 'Compte mis à jour' });
                },
                error: (e) => {
                    this.enregistrement = false;
                    this.erreur(e);
                }
            });
            return;
        }

        this.service.creerCompte(this.edite).subscribe({
            next: (cree) => {
                this.enregistrement = false;
                this.ouvert = false;
                this.charger();
                this.messages.add({ severity: 'success', summary: 'Compte créé' });
                if (cree.motDePasseProvisoire) {
                    this.compteConcerne = cree.utilisateur.identifiant;
                    this.motDePasseProvisoire = cree.motDePasseProvisoire;
                    this.motDePasseVisible = true;
                }
            },
            error: (e) => {
                this.enregistrement = false;
                this.erreur(e);
            }
        });
    }

    basculer(compte: Utilisateur): void {
        this.confirmation.confirm({
            header: compte.actif ? 'Suspendre ce compte ?' : 'Rétablir ce compte ?',
            message: compte.actif
                ? `${compte.identifiant} ne pourra plus ouvrir de session. Les licences qu'il a émises restent valables.`
                : `${compte.identifiant} pourra de nouveau se connecter.`,
            acceptLabel: 'Confirmer',
            rejectLabel: 'Annuler',
            accept: () => this.service.activerCompte(compte.id!, !compte.actif).subscribe({
                next: () => {
                    this.charger();
                    this.messages.add({
                        severity: 'success',
                        summary: compte.actif ? 'Compte suspendu' : 'Compte rétabli'
                    });
                },
                error: (e) => this.erreur(e)
            })
        });
    }

    reinitialiser(compte: Utilisateur): void {
        this.confirmation.confirm({
            header: 'Réinitialiser le mot de passe ?',
            message: `Un nouveau mot de passe sera tiré au hasard pour ${compte.identifiant} et `
                + `affiché une seule fois. L'ancien cessera aussitôt de fonctionner.`,
            acceptLabel: 'Réinitialiser',
            rejectLabel: 'Annuler',
            accept: () => this.service.reinitialiser(compte.id!).subscribe({
                next: (reponse) => {
                    this.charger();
                    this.compteConcerne = compte.identifiant;
                    this.motDePasseProvisoire = reponse.motDePasseProvisoire ?? '';
                    this.motDePasseVisible = !!reponse.motDePasseProvisoire;
                },
                error: (e) => this.erreur(e)
            })
        });
    }

    supprimer(compte: Utilisateur): void {
        this.confirmation.confirm({
            header: 'Supprimer ce compte ?',
            message: `${compte.identifiant} sera effacé. Son nom reste inscrit sur les licences `
                + `qu'il a émises — suspendre plutôt que supprimer préserve la lisibilité de l'historique.`,
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.service.supprimerCompte(compte.id!).subscribe({
                next: () => {
                    this.charger();
                    this.messages.add({ severity: 'success', summary: 'Compte supprimé' });
                },
                error: (e) => this.erreur(e)
            })
        });
    }

    copier(): void {
        navigator.clipboard.writeText(this.motDePasseProvisoire).then(
            () => this.messages.add({ severity: 'success', summary: 'Mot de passe copié' }),
            () => this.messages.add({ severity: 'warn', summary: 'Copie impossible — recopiez-le à la main' })
        );
    }

    private erreur(e: Error): void {
        this.messages.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 8000 });
    }
}

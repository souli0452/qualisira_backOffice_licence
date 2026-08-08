import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { ComptesService } from '../services/comptes.service';
import { ActionDeLigne, ColonneTableau, GabaritColonneDirective, TableauComponent } from '../shared';
import { SessionService } from '../services/session.service';
import { Permission, Role } from '../models/licences.model';

/**
 * Les rôles et ce qu'ils ouvrent.
 *
 * <p>Un rôle n'est qu'un paquet de permissions qu'on attribue d'un geste. Ouvrir une action à un
 * profil de plus se fait donc en cochant une case ici, sans toucher au code du serveur : ce sont
 * les permissions, et non les rôles, que chaque appel vérifie.</p>
 *
 * <p>Le super administrateur fait exception : ses permissions lui sont rendues à chaque
 * démarrage. Lui en retirer ne donnerait qu'une illusion — et pourrait refermer la gestion des
 * comptes sans laisser personne pour la rouvrir.</p>
 */
@Component({
    selector: 'app-roles',
    standalone: true,
    imports: [CommonModule, FormsModule, TableauComponent, GabaritColonneDirective, DialogModule, ButtonModule, InputTextModule,
        CheckboxModule, TagModule, TextareaModule, TooltipModule],
    template: `
        <div class="entete">
            <div>
                <h1>Rôles &amp; permissions</h1>
                <p>Ce que chaque rôle autorise. Les comptes ne portent aucun droit en propre : tout
                   leur vient des rôles qu'on leur attribue.</p>
            </div>
            @if (session.peut('HABILITATION_GERER')) {
                <p-button label="Nouveau rôle" icon="pi pi-plus" (onClick)="ouvrir()"></p-button>
            }
        </div>

        <div class="carte">
            <app-tableau [lignes]="roles" [colonnes]="colonnes" [chargement]="chargement"
                         [actions]="actionsDuRole" largeurDesActions="7rem"
                         messageVide="Aucun rôle.">

                <ng-template gabaritColonne="role" let-role>
                    <div class="principal">
                        {{ role.libelle }}
                        @if (role.systeme) {
                            <p-tag severity="secondary" value="fourni"
                                   pTooltip="Rôle de l'application : il ne se supprime pas."></p-tag>
                        }
                    </div>
                    <div class="secondaire">{{ role.code }} — {{ role.description || '—' }}</div>
                </ng-template>

                <ng-template gabaritColonne="ouvre" let-role>
                    <div>{{ role.permissions.length }} permission(s)</div>
                    <div class="secondaire">{{ domainesDe(role) }}</div>
                </ng-template>
            </app-tableau>
        </div>

        <p-dialog [header]="titreDuFormulaire" [(visible)]="ouvert" [modal]="true"
                  [style]="{ width: '52rem' }" [draggable]="false">
            @if (edite) {
                <div class="grille">
                    <div class="champ">
                        <label>Code <span class="requis">*</span></label>
                        <input pInputText [(ngModel)]="edite.code" [disabled]="!!enCoursId"
                               placeholder="CHEF_PROJET">
                        <span class="aide">
                            {{ enCoursId ? "Désigne aussi le rôle côté Keycloak : il ne se modifie plus."
                                         : 'Majuscules et soulignés. Le même code peut être créé dans Keycloak.' }}
                        </span>
                    </div>
                    <div class="champ">
                        <label>Libellé <span class="requis">*</span></label>
                        <input pInputText [(ngModel)]="edite.libelle" placeholder="Chef de projet">
                    </div>
                    <div class="champ pleine">
                        <label>Description</label>
                        <textarea pTextarea [(ngModel)]="edite.description" rows="2"
                                  placeholder="À qui ce rôle est destiné, et pourquoi."></textarea>
                    </div>
                </div>

                @if (systemeEdite) {
                    <div class="encart" style="margin-top:1rem">
                        @if (edite.code === 'SUPER_ADMIN') {
                            Le super administrateur reçoit toutes les permissions à chaque démarrage,
                            y compris celles ajoutées par une nouvelle version. Elles ne se retirent
                            pas : il est le seul recours si la gestion des comptes se referme.
                        } @else {
                            Rôle fourni par l'application : son libellé et sa description se
                            retouchent, ses permissions aussi.
                        }
                    </div>
                }

                <div style="margin-top:1.25rem">
                    <div class="carte-titre" style="border:0; padding:0 0 .6rem">
                        Permissions — {{ edite.permissions?.length || 0 }} cochée(s)
                    </div>

                    @for (domaine of domaines; track domaine.nom) {
                        <div style="margin-bottom:1rem">
                            <div class="secondaire" style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">
                                <strong>{{ domaine.nom }}</strong>
                                <button type="button" class="lien-tout" (click)="toutCocher(domaine)"
                                        [disabled]="verrouille">
                                    {{ toutEstCoche(domaine) ? 'tout décocher' : 'tout cocher' }}
                                </button>
                            </div>
                            <div class="cases">
                                @for (permission of domaine.permissions; track permission.code) {
                                    <label class="case">
                                        <p-checkbox [(ngModel)]="edite.permissions" [value]="permission.code"
                                                    [inputId]="permission.code"
                                                    [disabled]="verrouille"></p-checkbox>
                                        <span>
                                            <span class="titre">{{ permission.libelle }}</span>
                                            <span class="detail">{{ permission.code }}</span>
                                        </span>
                                    </label>
                                }
                            </div>
                        </div>
                    }
                </div>
            }

            <ng-template pTemplate="footer">
                <p-button [label]="verrouille ? 'Fermer' : 'Annuler'" severity="secondary" [text]="true"
                          (onClick)="ouvert = false"></p-button>
                @if (!verrouille) {
                    <p-button label="Enregistrer" icon="pi pi-check" [loading]="enregistrement"
                              (onClick)="enregistrer()"></p-button>
                }
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        .lien-tout {
            all: unset; cursor: pointer; font-size: .72rem; color: var(--marine-clair);
            text-decoration: underline;
        }
        .lien-tout[disabled] { cursor: default; color: var(--ardoise-400); text-decoration: none; }
    `]
})
export class RolesComponent implements OnInit {

    protected readonly colonnes: ColonneTableau[] = [
        { entete: 'Rôle', gabarit: 'role' },
        { entete: 'Ouvre', gabarit: 'ouvre' },
        { entete: 'Comptes', champ: 'comptes', largeur: '7rem' }
    ];

    /**
     * Qui n'a pas la main sur les rôles les consulte : l'écran s'ouvre en lecture plutôt que de se
     * fermer, car savoir ce qu'un rôle ouvre est utile même à qui ne peut pas le changer.
     */
    protected readonly actionsDuRole = (role: Role): ActionDeLigne[] => {
        if (!this.session.peut('HABILITATION_GERER')) {
            return [{ libelle: 'Voir les permissions', icone: 'pi pi-eye',
                      executer: () => this.ouvrir(role) }];
        }
        return [
            { libelle: 'Modifier', icone: 'pi pi-pencil', executer: () => this.ouvrir(role) },
            { libelle: 'Supprimer', icone: 'pi pi-trash', danger: true,
              visible: !role.systeme, executer: () => this.supprimer(role) }
        ];
    };


    private readonly service = inject(ComptesService);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);
    protected readonly session = inject(SessionService);

    roles: Role[] = [];
    catalogue: Permission[] = [];
    domaines: { nom: string; permissions: Permission[] }[] = [];
    chargement = true;
    enregistrement = false;

    ouvert = false;
    edite?: Partial<Role>;
    enCoursId?: string;
    systemeEdite = false;

    ngOnInit(): void {
        this.charger();
        this.service.permissions().subscribe({
            next: (p) => {
                this.catalogue = p;
                this.domaines = this.grouper(p);
            },
            error: (e) => this.erreur(e)
        });
    }

    /**
     * Les cases sont figées quand on n'a pas la main, et pour le super administrateur.
     *
     * <p>La fenêtre sert alors à consulter : voir ce qu'un rôle ouvre est utile même sans pouvoir
     * y toucher — c'est la première chose qu'on cherche avant de demander un droit.</p>
     */
    get verrouille(): boolean {
        return !this.session.peut('HABILITATION_GERER') || this.edite?.code === 'SUPER_ADMIN';
    }

    private charger(): void {
        this.chargement = true;
        this.service.roles().subscribe({
            next: (r) => {
                this.roles = r;
                this.chargement = false;
            },
            error: (e) => {
                this.chargement = false;
                this.erreur(e);
            }
        });
    }

    private grouper(permissions: Permission[]): { nom: string; permissions: Permission[] }[] {
        const parDomaine = new Map<string, Permission[]>();
        permissions.forEach((permission) => {
            const lot = parDomaine.get(permission.domaine) ?? [];
            lot.push(permission);
            parDomaine.set(permission.domaine, lot);
        });
        return [...parDomaine.entries()].map(([nom, lot]) => ({ nom, permissions: lot }));
    }

    domainesDe(role: Role): string {
        const noms = new Set<string>();
        role.permissions.forEach((code) => {
            const permission = this.catalogue.find((p) => p.code === code);
            if (permission) {
                noms.add(permission.domaine);
            }
        });
        return noms.size ? [...noms].join(' · ') : '—';
    }

    get titreDuFormulaire(): string {
        return this.enCoursId ? `Rôle ${this.edite?.code}` : 'Nouveau rôle';
    }

    ouvrir(role?: Role): void {
        this.enCoursId = role?.id;
        this.systemeEdite = !!role?.systeme;
        this.edite = role
            ? { ...role, permissions: [...role.permissions] }
            : { code: '', libelle: '', description: '', permissions: [] };
        this.ouvert = true;
    }

    toutEstCoche(domaine: { permissions: Permission[] }): boolean {
        const cochees = this.edite?.permissions ?? [];
        return domaine.permissions.every((permission) => cochees.includes(permission.code));
    }

    toutCocher(domaine: { permissions: Permission[] }): void {
        if (!this.edite || this.verrouille) return;
        const cochees = new Set(this.edite.permissions ?? []);
        const tout = this.toutEstCoche(domaine);
        domaine.permissions.forEach((permission) =>
            tout ? cochees.delete(permission.code) : cochees.add(permission.code));
        this.edite.permissions = [...cochees];
    }

    enregistrer(): void {
        if (!this.edite) return;
        this.enregistrement = true;

        const suite = this.enCoursId
            ? this.service.modifierRole(this.enCoursId, this.edite)
            : this.service.creerRole(this.edite);

        suite.subscribe({
            next: () => {
                this.enregistrement = false;
                this.ouvert = false;
                this.charger();
                this.messages.add({
                    severity: 'success',
                    summary: this.enCoursId ? 'Rôle mis à jour' : 'Rôle créé'
                });
            },
            error: (e) => {
                this.enregistrement = false;
                this.erreur(e);
            }
        });
    }

    supprimer(role: Role): void {
        this.confirmation.confirm({
            header: 'Supprimer ce rôle ?',
            message: role.comptes > 0
                ? `${role.comptes} compte(s) le portent : retirez-le-leur d'abord.`
                : `Le rôle « ${role.libelle} » sera effacé.`,
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.service.supprimerRole(role.id!).subscribe({
                next: () => {
                    this.charger();
                    this.messages.add({ severity: 'success', summary: 'Rôle supprimé' });
                },
                error: (e) => this.erreur(e)
            })
        });
    }

    private erreur(e: Error): void {
        this.messages.add({ severity: 'error', summary: 'Erreur', detail: e.message, life: 8000 });
    }
}

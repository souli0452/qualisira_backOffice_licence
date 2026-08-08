import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { TagModule } from 'primeng/tag';

import { SessionService } from '../services/session.service';

/**
 * Son propre compte : ce qu'il ouvre, et le changement de mot de passe.
 *
 * <p>Un compte créé par un administrateur porte un mot de passe que celui-ci connaît : tant qu'il
 * n'a pas été changé, « émise par » ne désigne personne avec certitude. D'où le bandeau qui le
 * réclame tant que c'est le cas.</p>
 *
 * <p>En mode Keycloak, les mots de passe sont tenus par le royaume : l'écran se contente alors de
 * montrer les droits, et renvoie vers le fournisseur d'identité.</p>
 */
@Component({
    selector: 'app-mon-compte',
    standalone: true,
    imports: [CommonModule, FormsModule, PasswordModule, ButtonModule, TagModule],
    template: `
        <div class="entete">
            <div>
                <h1>Mon compte</h1>
                <p>Ce que votre session ouvre, et votre mot de passe.</p>
            </div>
        </div>

        @if (session.session(); as ouverte) {
            <div class="carte">
                <div class="carte-titre">{{ ouverte.nomComplet || ouverte.utilisateur }}</div>
                <div class="carte-corps">
                    <div class="grille">
                        <div class="champ">
                            <label>Identifiant</label>
                            <div>{{ ouverte.utilisateur }}</div>
                        </div>
                        <div class="champ">
                            <label>Authentification</label>
                            <div>{{ ouverte.mode === 'keycloak' ? 'Keycloak' : 'Compte local' }}</div>
                        </div>
                        <div class="champ pleine">
                            <label>Rôles</label>
                            <div>
                                @for (role of ouverte.roles; track role) {
                                    <p-tag [severity]="role === 'SUPER_ADMIN' ? 'danger' : 'secondary'"
                                           [value]="role" styleClass="etiquette"></p-tag>
                                } @empty {
                                    <span class="secondaire">Aucun rôle.</span>
                                }
                            </div>
                        </div>
                        <div class="champ pleine">
                            <label>Permissions ({{ ouverte.permissions.length }})</label>
                            <div class="jeton">{{ ouverte.permissions.join('\\n') }}</div>
                            <span class="aide">Ce sont elles que chaque appel vérifie. Pour en
                                obtenir une de plus, demandez le rôle qui la porte.</span>
                        </div>
                    </div>
                </div>
            </div>

            @if (ouverte.mode === 'keycloak') {
                <div class="encart">
                    Les mots de passe sont tenus par Keycloak : le vôtre se change depuis votre
                    compte du royaume, pas ici.
                </div>
            } @else {
                @if (ouverte.doitChangerMotDePasse) {
                    <div class="encart" style="margin-bottom:1.25rem">
                        Votre mot de passe est celui remis par un administrateur : il le connaît.
                        Changez-le pour que ce compte soit vraiment le vôtre.
                    </div>
                }

                <div class="carte">
                    <div class="carte-titre">Changer mon mot de passe</div>
                    <div class="carte-corps">
                        <form (ngSubmit)="changer()" style="max-width:26rem">
                            <div class="champ">
                                <label>Mot de passe actuel</label>
                                <p-password name="ancien" [(ngModel)]="ancien" [feedback]="false"
                                            [toggleMask]="true" styleClass="pleine-largeur"
                                            inputStyleClass="pleine-largeur"
                                            autocomplete="current-password"></p-password>
                            </div>
                            <div class="champ" style="margin-top:.9rem">
                                <label>Nouveau mot de passe</label>
                                <p-password name="nouveau" [(ngModel)]="nouveau" [toggleMask]="true"
                                            styleClass="pleine-largeur" inputStyleClass="pleine-largeur"
                                            promptLabel="Choisissez un mot de passe"
                                            weakLabel="Faible" mediumLabel="Correct" strongLabel="Solide"
                                            autocomplete="new-password"></p-password>
                                <span class="aide">Huit caractères au moins.</span>
                            </div>
                            <div class="champ" style="margin-top:.9rem">
                                <label>Confirmation</label>
                                <p-password name="confirmation" [(ngModel)]="confirmation"
                                            [feedback]="false" [toggleMask]="true"
                                            styleClass="pleine-largeur" inputStyleClass="pleine-largeur"
                                            autocomplete="new-password"></p-password>
                            </div>

                            @if (erreur) {
                                <div class="encart" style="margin-top:1rem;background:#fef2f2;color:#991b1b;border-color:#fecaca">
                                    {{ erreur }}
                                </div>
                            }

                            <div style="margin-top:1.25rem">
                                <p-button type="submit" label="Changer le mot de passe" icon="pi pi-key"
                                          [loading]="enCours"></p-button>
                            </div>
                        </form>
                    </div>
                </div>
            }
        }
    `,
    styles: [`
        :host ::ng-deep .etiquette { margin-right: .25rem; }
        :host ::ng-deep .pleine-largeur { width: 100%; }
        :host ::ng-deep .p-password { width: 100%; }
    `]
})
export class MonCompteComponent {

    protected readonly session = inject(SessionService);
    private readonly messages = inject(MessageService);
    private readonly router = inject(Router);

    ancien = '';
    nouveau = '';
    confirmation = '';
    erreur = '';
    enCours = false;

    changer(): void {
        this.erreur = '';
        if (this.nouveau !== this.confirmation) {
            this.erreur = 'Le nouveau mot de passe et sa confirmation diffèrent.';
            return;
        }
        if (this.nouveau.length < 8) {
            this.erreur = 'Le mot de passe fait au moins 8 caractères.';
            return;
        }

        this.enCours = true;
        this.session.changerLeMotDePasse(this.ancien, this.nouveau).subscribe({
            next: () => {
                this.enCours = false;
                this.ancien = this.nouveau = this.confirmation = '';
                this.messages.add({ severity: 'success', summary: 'Mot de passe changé' });
                this.router.navigate(['/licences']);
            },
            error: (e: Error) => {
                this.enCours = false;
                this.erreur = e.message;
            }
        });
    }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { SessionService } from '../services/session.service';

/**
 * Écran de connexion du back-office.
 *
 * <p>Il remplace la fenêtre d'authentification du navigateur, qu'on ne peut ni mettre aux
 * couleurs de l'application, ni refermer depuis la page — se déconnecter obligeait à fermer le
 * navigateur.</p>
 *
 * <p>En mode Keycloak, cet écran n'a pas lieu d'être : la page redirige vers le fournisseur
 * d'identité, qui authentifie et renvoie ici.</p>
 */
@Component({
    selector: 'app-connexion',
    standalone: true,
    imports: [CommonModule, FormsModule, InputTextModule, PasswordModule, ButtonModule],
    template: `
        <div class="page-connexion">
            <div class="carte-connexion">
                <div class="marque">
                    <img src="assets/logo-quali-sira.svg" alt="QualiSira" class="logo">
                    <div>
                        <div class="nom">QualiSira</div>
                        <div class="sous-titre">Licences &amp; abonnements</div>
                    </div>
                </div>

                <p class="intro">
                    Outil interne d'émission des licences. L'accès est réservé à l'équipe éditeur.
                </p>

                @if (erreur) {
                    <div class="erreur" style="margin-bottom:1rem">{{ erreur }}</div>
                }

                @switch (parKeycloak()) {
                    @case (true) {
                        <div class="bouton-connexion" style="margin-top:0">
                            <p-button label="Se connecter avec Keycloak" icon="pi pi-shield"
                                      styleClass="pleine-largeur"
                                      (onClick)="connecterParKeycloak()"></p-button>
                        </div>
                        <p class="aide-keycloak">
                            Vos identifiants sont ceux de votre compte QualiSira. Le mot de passe
                            se change depuis le royaume, jamais ici.
                        </p>
                    }
                    @case (false) {
                        <form (ngSubmit)="connecter()">
                            <div class="champ">
                                <label for="utilisateur">Identifiant</label>
                                <input pInputText id="utilisateur" name="utilisateur"
                                       [(ngModel)]="utilisateur" autocomplete="username" autofocus>
                            </div>

                            <div class="champ" style="margin-top:.9rem">
                                <label for="motDePasse">Mot de passe</label>
                                <p-password id="motDePasse" name="motDePasse" [(ngModel)]="motDePasse"
                                            [feedback]="false" [toggleMask]="true"
                                            styleClass="pleine-largeur"
                                            inputStyleClass="pleine-largeur"
                                            autocomplete="current-password"></p-password>
                            </div>

                            <div class="bouton-connexion">
                                <p-button type="submit" label="Se connecter" icon="pi pi-sign-in"
                                          styleClass="pleine-largeur" [loading]="enCours"></p-button>
                            </div>
                        </form>
                    }
                }
            </div>
        </div>
    `,
    styles: [`
        .page-connexion {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(160deg, #1e3a5f 0%, #122238 100%);
            padding: 1.5rem;
        }
        .carte-connexion {
            background: #fff;
            border-radius: .75rem;
            padding: 2rem;
            width: 100%;
            max-width: 24rem;
            box-shadow: 0 20px 50px rgba(15, 23, 42, .35);
        }
        .marque { display: flex; align-items: center; gap: .75rem; }
        .marque .logo { width: 2.75rem; height: auto; flex-shrink: 0; }
        .marque .nom { font-size: 1.35rem; font-weight: 700; color: #1e3a5f; line-height: 1.1; }
        .marque .sous-titre { font-size: .78rem; color: #64748b; margin-top: .1rem; }
        .intro {
            font-size: .8rem; color: #64748b; line-height: 1.5;
            margin: 1.25rem 0 1.5rem; padding-top: 1.25rem;
            border-top: 1px solid #e2e8f0;
        }
        .erreur {
            margin-top: 1rem; padding: .7rem .85rem; border-radius: .5rem;
            background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: .82rem;
        }
        .aide-keycloak {
            font-size: .75rem; color: #64748b; line-height: 1.5; margin: 1rem 0 0;
        }
        .bouton-connexion { margin-top: 1.25rem; }
        :host ::ng-deep .pleine-largeur { width: 100%; }
        :host ::ng-deep .p-password { width: 100%; }
    `]
})
export class ConnexionComponent implements OnInit {

    private readonly service = inject(SessionService);
    private readonly router = inject(Router);
    private readonly adresse = inject(ActivatedRoute);

    utilisateur = '';
    motDePasse = '';
    erreur = '';
    enCours = false;

    /**
     * Indéterminé tant que le serveur n'a pas répondu — et l'écran n'affiche alors ni l'un ni
     * l'autre. Supposer le formulaire local le ferait apparaître puis disparaître à chaque
     * ouverture en mode Keycloak, et inviterait à saisir un mot de passe qui n'a pas cours ici.
     */
    readonly parKeycloak = signal<boolean | undefined>(undefined);

    ngOnInit(): void {
        // Keycloak a bien authentifié, mais le rôle d'entrée manque : le renvoyer vers le royaume
        // le reconnecterait aussitôt pour se voir refuser encore. Il doit lire pourquoi.
        if (this.adresse.snapshot.queryParamMap.get('acces') === 'refuse') {
            this.erreur = "Votre compte est reconnu, mais il n'a pas le rôle qui ouvre cet outil. "
                + 'Demandez-le à un administrateur du royaume.';
        }

        this.service.mode().subscribe({
            next: (mode) => this.parKeycloak.set(mode.keycloak),
            // Le serveur muet sur ce point : le formulaire local est le moindre mal, il porte au
            // moins un message d'erreur lisible si ce n'était pas le bon.
            error: () => this.parKeycloak.set(false)
        });

        // Revenir sur cet écran avec une session encore ouverte — un bouton « précédent » —
        // ne doit pas obliger à se reconnecter.
        this.service.verifier().subscribe({
            next: () => this.router.navigate(['/licences']),
            error: () => undefined
        });
    }

    connecterParKeycloak(): void {
        this.service.connexionKeycloak();
    }

    connecter(): void {
        this.erreur = '';
        this.enCours = true;
        this.service.connexion(this.utilisateur, this.motDePasse).subscribe({
            next: () => {
                this.enCours = false;
                this.router.navigate(['/licences']);
            },
            error: (e: Error) => {
                this.enCours = false;
                this.erreur = e.message;
            }
        });
    }
}

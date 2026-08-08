import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { SessionService } from './services/session.service';

/**
 * Ossature du back-office : le rail de navigation, et l'écran courant.
 *
 * <p>Le rail disparaît sur l'écran de connexion : y afficher une navigation vers des écrans
 * fermés ne mènerait qu'à des refus.</p>
 */
@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastModule, ConfirmDialogModule],
    template: `
        <p-toast position="top-right"></p-toast>
        <p-confirmDialog></p-confirmDialog>

        @if (surLaConnexion()) {
            <router-outlet></router-outlet>
        } @else {
            <div class="appli">
                <aside class="rail">
                    <div class="rail-marque">
                        <img src="assets/logo-quali-sira.svg" alt="QualiSira" class="logo">
                        <div>
                            <div class="nom">QualiSira</div>
                            <div class="sous-titre">Licences &amp; abonnements</div>
                        </div>
                    </div>

                    <nav class="rail-nav">
                        <!-- En tête : c'est l'écran qu'on ouvre pour savoir où l'on en est, avant
                             d'aller chercher une licence en particulier. -->
                        @if (session.peut('TABLEAU_DE_BORD_LIRE')) {
                            <a routerLink="/tableau-de-bord" routerLinkActive="actif">
                                <i class="pi pi-chart-bar"></i> Tableau de bord
                            </a>
                        }
                        <a routerLink="/licences" routerLinkActive="actif">
                            <i class="pi pi-key"></i> Licences
                        </a>
                        <a routerLink="/partenaires" routerLinkActive="actif">
                            <i class="pi pi-building"></i> Partenaires
                        </a>
                        <a routerLink="/offres" routerLinkActive="actif">
                            <i class="pi pi-tags"></i> Offres d'abonnement
                        </a>
                        <a routerLink="/cle" routerLinkActive="actif">
                            <i class="pi pi-verified"></i> Clé de vérification
                        </a>

                        <!-- L'administration n'apparaît qu'à qui en a la permission : proposer
                             un écran qui répondra « cette action ne vous est pas ouverte » ne
                             renseigne personne. -->
                        @if (session.peut('UTILISATEUR_LIRE') || session.peut('HABILITATION_LIRE')
                             || session.peut('REGLAGE_LIRE') || session.peut('JOURNAL_LIRE')) {
                            <div class="rail-section">Administration</div>
                            @if (session.peut('UTILISATEUR_LIRE')) {
                                <a routerLink="/comptes" routerLinkActive="actif">
                                    <i class="pi pi-users"></i> Comptes
                                </a>
                            }
                            @if (session.peut('HABILITATION_LIRE')) {
                                <a routerLink="/roles" routerLinkActive="actif">
                                    <i class="pi pi-shield"></i> Rôles &amp; permissions
                                </a>
                            }
                            @if (session.peut('REGLAGE_LIRE')) {
                                <a routerLink="/reglages" routerLinkActive="actif">
                                    <i class="pi pi-cog"></i> Réglages
                                </a>
                            }
                            @if (session.peut('JOURNAL_LIRE')) {
                                <a routerLink="/journal" routerLinkActive="actif">
                                    <i class="pi pi-history"></i> Journal des actions
                                </a>
                            }
                        }
                    </nav>

                    <div class="rail-pied">
                        @if (session.session(); as ouverte) {
                            <a routerLink="/mon-compte" class="session-nom lien-compte">
                                {{ ouverte.nomComplet || ouverte.utilisateur }}
                                @if (ouverte.doitChangerMotDePasse) {
                                    <i class="pi pi-exclamation-circle" title="Mot de passe provisoire à changer"></i>
                                }
                            </a>
                            <div class="session-mode">{{ ouverte.roles.join(' · ') || 'aucun rôle' }}</div>
                            <button type="button" class="lien-deconnexion" (click)="deconnecter()">
                                Se déconnecter
                            </button>
                        }
                        <div style="margin-top:.75rem">
                            Outil interne — ne jamais déployer chez un partenaire.
                        </div>
                    </div>
                </aside>

                <main class="contenu">
                    <router-outlet></router-outlet>
                </main>
            </div>
        }
    `,
    styles: [`
        .lien-deconnexion {
            all: unset; cursor: pointer; font-size: .72rem; margin-top: .4rem; display: block;
            color: rgba(255, 255, 255, .6); text-decoration: underline;
        }
        .lien-deconnexion:hover { color: #fff; }
        .lien-compte { text-decoration: none; color: rgba(255, 255, 255, .85); display: block; }
        .lien-compte:hover { color: #fff; text-decoration: underline; }
        .lien-compte .pi { font-size: .72rem; color: #fbbf24; margin-left: .2rem; }
        .rail-section {
            font-size: .66rem; text-transform: uppercase; letter-spacing: .06em;
            color: rgba(255, 255, 255, .38); padding: 1rem .85rem .3rem;
        }
    `]
})
export class AppComponent {

    private readonly router = inject(Router);
    protected readonly session = inject(SessionService);

    /** L'écran de connexion occupe la page entière, sans rail ni marges. */
    protected readonly surLaConnexion = toSignal(
        this.router.events.pipe(
            filter((evenement): evenement is NavigationEnd => evenement instanceof NavigationEnd),
            map((evenement) => evenement.urlAfterRedirects.startsWith('/connexion')),
            startWith(this.router.url.startsWith('/connexion'))
        ),
        { initialValue: false }
    );

    deconnecter(): void {
        // En mode Keycloak, fermer la seule session locale ne déconnecterait de rien : le cookie
        // du royaume rouvrirait la suivante sans rien demander, et « se déconnecter » ne
        // déconnecterait de personne sur un poste partagé. La déconnexion doit passer par le
        // royaume, qui ramène ensuite sur l'écran de connexion.
        if (this.session.session()?.mode === 'keycloak') {
            this.session.deconnexionKeycloak();
            return;
        }

        // La navigation a lieu dans les deux cas : une session déjà close côté serveur ne doit
        // pas laisser l'utilisateur devant un écran dont il croit être sorti.
        this.session.deconnexion().subscribe({
            next: () => this.router.navigate(['/connexion']),
            error: () => this.router.navigate(['/connexion'])
        });
    }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { Parametre } from '../models/licences.model';
import { ParametresService } from '../services/parametres.service';
import { SessionService } from '../services/session.service';

/**
 * Ce qui figure au bas des courriels de licence : les coordonnées de l'éditeur, et son logo.
 *
 * <p>Ces valeurs vivent en base plutôt qu'en configuration : le courriel de licence est souvent le
 * premier contact technique d'une installation, et changer un numéro de téléphone ne doit pas
 * demander de livrer une version.</p>
 *
 * <p>On ne crée ni ne supprime aucun réglage ici — la liste appartient au serveur, qui la sème au
 * démarrage, exactement comme le catalogue des permissions. Laisser saisir une clé librement, ce
 * serait permettre d'en fabriquer une que rien ne lit, sans qu'aucun message ne le signale.</p>
 *
 * <p>Un réglage laissé vide n'est pas une erreur : sa ligne disparaît simplement du pied. C'est
 * pourquoi rien n'est obligatoire ici, et pourquoi le logo se retire.</p>
 */
@Component({
    selector: 'app-reglages',
    standalone: true,
    imports: [CommonModule, FormsModule, InputTextModule, ButtonModule],
    template: `
        <div class="entete">
            <div>
                <h1>Réglages</h1>
                <p>Ce qui figure au bas des courriels de licence. Un réglage laissé vide disparaît
                   du pied — il n'y a pas de valeur obligatoire.</p>
            </div>
        </div>

        @if (chargement()) {
            <div class="carte"><div class="carte-corps secondaire">Chargement…</div></div>
        } @else {
            <div class="carte">
                <div class="carte-titre">Coordonnées</div>
                <div class="carte-corps">
                    @for (reglage of textuels(); track reglage.cle) {
                        <div class="champ" style="margin-bottom:1.1rem;max-width:32rem">
                            <label [for]="reglage.cle">{{ reglage.libelle }}</label>
                            <input pInputText [id]="reglage.cle" [(ngModel)]="saisies[reglage.cle]"
                                   [type]="typeDeChamp(reglage)" class="pleine-largeur"
                                   [placeholder]="exemple(reglage)">
                            @if (reglage.description) {
                                <span class="aide">{{ reglage.description }}</span>
                            }
                        </div>
                    }

                    <div class="actions">
                        <p-button label="Enregistrer les coordonnées" icon="pi pi-check"
                                  [loading]="enregistrement()"
                                  (onClick)="enregistrerLesTextes()"></p-button>
                    </div>
                </div>
            </div>

            @if (logo(); as reglageLogo) {
                <div class="carte">
                    <div class="carte-titre">{{ reglageLogo.libelle }}</div>
                    <div class="carte-corps">
                        <div class="apercu-logo">
                            @if (apercu()) {
                                <img [src]="apercu()" alt="Logo" class="apercu">
                            } @else {
                                <div class="apercu vide">Aucun logo</div>
                            }
                            <div>
                                @if (reglageLogo.description) {
                                    <p class="aide" style="margin:0 0 .75rem">
                                        {{ reglageLogo.description }}</p>
                                }
                                <input type="file" accept="image/png,image/jpeg"
                                       (change)="choisirLeLogo($event)" hidden #fichier>
                                <div class="actions">
                                    <p-button label="Remplacer" icon="pi pi-upload"
                                              severity="secondary" [outlined]="true"
                                              (onClick)="fichier.click()"></p-button>
                                    @if (apercu()) {
                                        <p-button label="Retirer" icon="pi pi-times"
                                                  severity="danger" [text]="true"
                                                  (onClick)="retirerLeLogo()"></p-button>
                                    }
                                </div>
                                <span class="aide" style="display:block;margin-top:.6rem">
                                    PNG ou JPEG, 512 Ko au plus — il voyage dans chaque courriel
                                    envoyé. Le fond transparent d'un PNG apparaîtra blanc chez la
                                    plupart des destinataires.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            }

            <div class="encart">
                Le logo est <strong>joint au message</strong> plutôt que lié à une adresse : une
                image distante serait bloquée par défaut par la plupart des messageries, et le pied
                arriverait sans elle.
            </div>
        }
    `,
    styles: [`
        .apercu-logo { display: flex; gap: 1.5rem; align-items: flex-start; flex-wrap: wrap; }
        .apercu {
            width: 8rem; height: 8rem; object-fit: contain; background: #fff;
            border: 1px solid #e2e8f0; border-radius: .75rem; padding: .75rem; flex-shrink: 0;
        }
        .apercu.vide {
            display: flex; align-items: center; justify-content: center;
            color: #94a3b8; font-size: .78rem; background: #f8fafc; border-style: dashed;
        }
        :host ::ng-deep .pleine-largeur { width: 100%; }
    `]
})
export class ReglagesComponent implements OnInit {

    private readonly service = inject(ParametresService);
    private readonly messages = inject(MessageService);
    protected readonly session = inject(SessionService);

    /** Au-delà, le serveur refuse : le contrôle est repris ici pour le dire avant l'envoi. */
    private static readonly OCTETS_MAX = 512 * 1024;

    protected readonly reglages = signal<Parametre[]>([]);
    protected readonly chargement = signal(true);
    protected readonly enregistrement = signal(false);
    protected readonly apercu = signal<string | null>(null);

    /** Les valeurs en cours de saisie, par clé — le signal ne porte que ce que le serveur a rendu. */
    protected saisies: Record<string, string> = {};

    protected readonly textuels = () => this.reglages().filter((r) => r.type !== 'IMAGE');
    protected readonly logo = () => this.reglages().find((r) => r.type === 'IMAGE');

    ngOnInit(): void {
        this.charger();
    }

    private charger(): void {
        this.chargement.set(true);
        this.service.lister().subscribe({
            next: (reglages) => {
                this.reglages.set(reglages);
                this.saisies = {};
                reglages.forEach((r) => (this.saisies[r.cle] = r.valeur ?? ''));
                this.apercu.set(this.logo()?.valeur ?? null);
                this.chargement.set(false);
            },
            error: () => this.chargement.set(false)
        });
    }

    protected typeDeChamp(reglage: Parametre): string {
        switch (reglage.type) {
            case 'COURRIEL': return 'email';
            case 'TELEPHONE': return 'tel';
            case 'URL': return 'url';
            default: return 'text';
        }
    }

    protected exemple(reglage: Parametre): string {
        switch (reglage.type) {
            case 'COURRIEL': return 'contact@exemple.com';
            case 'TELEPHONE': return '+226 00 00 00 00';
            case 'URL': return 'https://exemple.com';
            default: return '';
        }
    }

    /**
     * Enregistre les coordonnées, une clé à la fois.
     *
     * <p>Seules celles qui ont changé partent : réenvoyer l'ensemble inscrirait une date de
     * modification sur des réglages que personne n'a touchés, et l'on ne saurait plus qui a changé
     * quoi.</p>
     */
    protected enregistrerLesTextes(): void {
        const modifies = this.textuels()
            .filter((r) => (this.saisies[r.cle] ?? '') !== (r.valeur ?? ''));

        if (modifies.length === 0) {
            this.messages.add({ severity: 'info', summary: 'Rien à enregistrer',
                detail: 'Aucune coordonnée n\'a changé.' });
            return;
        }

        this.enregistrement.set(true);
        let restants = modifies.length;
        let enEchec = false;

        modifies.forEach((reglage) => {
            this.service.modifier(reglage.cle, this.saisies[reglage.cle] ?? '').subscribe({
                next: () => this.terminer(--restants, enEchec),
                error: (e: Error) => {
                    enEchec = true;
                    this.messages.add({ severity: 'error', summary: reglage.libelle,
                        detail: e.message, life: 8000 });
                    this.terminer(--restants, enEchec);
                }
            });
        });
    }

    private terminer(restants: number, enEchec: boolean): void {
        if (restants > 0) {
            return;
        }
        this.enregistrement.set(false);
        if (!enEchec) {
            this.messages.add({ severity: 'success', summary: 'Enregistré',
                detail: 'Le pied des prochains courriels reprendra ces coordonnées.' });
        }
        // Rechargé dans les deux cas : après un échec partiel, l'écran doit montrer ce qui est
        // réellement enregistré, et non ce qui avait été saisi.
        this.charger();
    }

    /**
     * Lit le fichier choisi et l'encode en {@code data:} avant de l'envoyer.
     *
     * <p>Encodé ici plutôt qu'envoyé en pièce jointe : c'est sous cette forme que la valeur est
     * conservée, et sous cette forme qu'elle repart dans les courriels.</p>
     */
    protected choisirLeLogo(evenement: Event): void {
        const entree = evenement.target as HTMLInputElement;
        const fichier = entree.files?.[0];
        if (!fichier) {
            return;
        }
        // Le contrôle est refait par le serveur ; le poser ici évite d'envoyer un fichier de
        // plusieurs mégaoctets pour se le voir refuser.
        if (fichier.size > ReglagesComponent.OCTETS_MAX) {
            this.messages.add({ severity: 'error', summary: 'Image trop lourde',
                detail: `${Math.round(fichier.size / 1024)} Ko, au-delà des 512 Ko admis.`,
                life: 8000 });
            entree.value = '';
            return;
        }

        const lecteur = new FileReader();
        lecteur.onload = () => {
            this.envoyerLeLogo(lecteur.result as string);
            entree.value = '';
        };
        lecteur.onerror = () => this.messages.add({ severity: 'error', summary: 'Lecture impossible',
            detail: "Le fichier n'a pas pu être lu." });
        lecteur.readAsDataURL(fichier);
    }

    protected retirerLeLogo(): void {
        this.envoyerLeLogo('');
    }

    private envoyerLeLogo(valeur: string): void {
        const reglage = this.logo();
        if (!reglage) {
            return;
        }
        this.enregistrement.set(true);
        this.service.modifier(reglage.cle, valeur).subscribe({
            next: () => {
                this.enregistrement.set(false);
                this.messages.add({ severity: 'success', summary: 'Logo enregistré',
                    detail: valeur ? 'Il figurera au bas des prochains courriels.'
                                   : 'Les prochains courriels partiront sans logo.' });
                this.charger();
            },
            error: (e: Error) => {
                this.enregistrement.set(false);
                this.messages.add({ severity: 'error', summary: 'Logo refusé',
                    detail: e.message, life: 8000 });
            }
        });
    }
}

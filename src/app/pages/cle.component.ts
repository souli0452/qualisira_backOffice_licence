import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { LicencesService } from '../services/licences.service';
import { ContenuDeLicence } from '../models/licences.model';

/**
 * La clé publique à embarquer dans QualiSira, et le moyen de relire une licence.
 *
 * <p>La clé publique se diffuse sans risque : elle permet de <b>vérifier</b> une licence, jamais
 * d'en signer une. C'est l'inverse exact de la clé privée, qui ne quitte pas le serveur de
 * licences — et c'est toute la différence avec le chiffrement symétrique employé jusqu'ici, dont
 * la clé unique, livrée avec le produit, laissait fabriquer n'importe quelle licence.</p>
 */
@Component({
    selector: 'app-cle',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, TagModule, TextareaModule],
    template: `
        <div class="entete">
            <div>
                <h1>Clé de vérification</h1>
                <p>À embarquer dans QualiSira pour qu'il puisse vérifier les licences. Elle se
                   diffuse sans risque : elle permet de vérifier, jamais de signer.</p>
            </div>
        </div>

        <div class="carte">
            <div class="carte-titre">Clé publique de l'éditeur ({{ algorithme }})</div>
            <div class="carte-corps">
                <div class="jeton">{{ clePublique }}</div>
                <div class="actions" style="margin-top:1rem">
                    <p-button label="Copier la clé" icon="pi pi-copy" severity="secondary"
                              [outlined]="true" (onClick)="copier(clePublique)"></p-button>
                </div>

                <div class="encart" style="margin-top:1rem">
                    <strong>À placer dans la configuration de QualiSira :</strong>
                    <div class="jeton" style="margin-top:.5rem">{{ extraitDeConfiguration }}</div>
                    <div class="aide" style="margin-top:.5rem">
                        La clé privée correspondante reste dans
                        <code>data/cles-editeur.properties</code> sur le serveur de licences.
                        Sauvegardez ce fichier : sans lui, plus aucune licence ne peut être émise
                        pour les installations existantes.
                    </div>
                </div>
            </div>
        </div>

        <div class="carte">
            <div class="carte-titre">Vérifier une licence</div>
            <div class="carte-corps">
                <div class="champ">
                    <label>Coller une licence pour la relire comme le fera QualiSira</label>
                    <textarea pTextarea [(ngModel)]="jetonASoumettre" rows="4"
                              placeholder="QSL1...."></textarea>
                    <span class="aide">Sert à lever un doute au support : « la licence que je vous
                        ai envoyée est-elle la bonne ? », sans avoir à la déployer pour le savoir.</span>
                </div>
                <div class="actions" style="margin-top:1rem">
                    <p-button label="Vérifier" icon="pi pi-search" severity="secondary"
                              [outlined]="true" [loading]="verification"
                              (onClick)="verifier()"></p-button>
                </div>

                @if (resultat) {
                    <div class="encart" style="margin-top:1rem"
                         [style.background]="expiree ? '#fef2f2' : '#ecfdf5'"
                         [style.borderColor]="expiree ? '#fecaca' : '#a7f3d0'"
                         [style.color]="expiree ? '#991b1b' : '#065f46'">
                        <strong>Signature authentique.</strong><br>
                        {{ resultat.nom }} ({{ resultat.cli }}) — {{ resultat.ref }}<br>
                        Du {{ resultat.deb | date: 'dd/MM/yyyy' }}
                        au {{ resultat.fin | date: 'dd/MM/yyyy' }}
                        @if (expiree) { <strong>— expirée</strong> }<br>
                        {{ resultat.mod.length }} module(s) ·
                        {{ resultat.usr === 0 ? 'utilisateurs illimités' : resultat.usr + ' utilisateurs' }}
                    </div>
                }
                @if (erreurVerification) {
                    <div class="encart" style="margin-top:1rem;background:#fef2f2;
                                border-color:#fecaca;color:#991b1b">
                        {{ erreurVerification }}
                    </div>
                }
            </div>
        </div>
    `
})
export class CleComponent implements OnInit {

    private readonly service = inject(LicencesService);
    private readonly messages = inject(MessageService);

    clePublique = '…';
    algorithme = 'Ed25519';

    jetonASoumettre = '';
    verification = false;
    resultat?: ContenuDeLicence;
    erreurVerification = '';

    ngOnInit(): void {
        this.service.clePublique().subscribe({
            next: (cle) => {
                this.clePublique = cle.clePublique;
                this.algorithme = cle.algorithme;
            },
            error: (e: Error) => this.messages.add({
                severity: 'error', summary: 'Erreur', detail: e.message, life: 8000
            })
        });
    }

    get extraitDeConfiguration(): string {
        return `qualisira:\n  licence:\n    cle-publique: ${this.clePublique}`;
    }

    get expiree(): boolean {
        return !!this.resultat && new Date(this.resultat.fin) < new Date();
    }

    verifier(): void {
        this.resultat = undefined;
        this.erreurVerification = '';
        this.verification = true;

        this.service.verifier(this.jetonASoumettre).subscribe({
            next: (contenu) => {
                this.verification = false;
                this.resultat = contenu;
            },
            error: (e: Error) => {
                this.verification = false;
                this.erreurVerification = e.message;
            }
        });
    }

    async copier(valeur: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(valeur);
            this.messages.add({ severity: 'success', summary: 'Copié dans le presse-papiers' });
        } catch {
            this.messages.add({
                severity: 'warn',
                summary: 'Copie automatique refusée',
                detail: 'Sélectionnez le texte à la main.'
            });
        }
    }
}

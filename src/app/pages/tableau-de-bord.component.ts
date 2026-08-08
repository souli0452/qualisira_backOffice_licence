import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { MoisDeRevenu, TableauDeBord } from '../models/licences.model';
import { TableauDeBordService } from '../services/tableau-de-bord.service';

/**
 * L'état du parc, et ce qu'il rapporte.
 *
 * <p>Les revenus sont présentés <b>par devise</b>, jamais réunis en un total unique : additionner
 * des francs CFA et des euros donnerait un nombre que personne ne pourrait rapprocher d'une
 * comptabilité.</p>
 *
 * <p>Les barres sont en CSS et non tirées d'une bibliothèque de graphiques : douze valeurs se
 * lisent très bien ainsi, et cela évite d'embarquer trois cents kilo-octets dans une application
 * interne pour dessiner un histogramme.</p>
 */
@Component({
    selector: 'app-tableau-de-bord',
    standalone: true,
    imports: [CommonModule, RouterLink, TagModule, TooltipModule],
    template: `
        <div class="entete">
            <div>
                <h1>Tableau de bord</h1>
                <p>L'état du parc de licences et ce qu'il rapporte. Les revenus portent sur le
                   montant figé à l'émission — réviser un tarif ne réécrit pas un exercice clos.</p>
            </div>
        </div>

        @if (bord(); as b) {

            @if (b.licencesSansMontant > 0) {
                <div class="encart" style="margin-bottom:1.25rem">
                    <strong>{{ b.licencesSansMontant }}</strong> licence(s) facturable(s) ne portent
                    aucun montant — elles comptent pour zéro dans les revenus ci-dessous. Ce sont
                    celles émises avant que leur offre n'ait un prix. Renseignez le montant des
                    offres pour que les prochaines émissions soient comptées.
                </div>
            }

            <div class="resume">
                <a class="tuile lien" routerLink="/partenaires">
                    <div class="nombre">{{ b.partenaires.total }}</div>
                    <div class="quoi">Partenaires · {{ b.partenaires.actifs }} actifs</div>
                </a>
                <a class="tuile lien" routerLink="/licences">
                    <div class="nombre">{{ b.licences.actives }}</div>
                    <div class="quoi">Licences en cours · {{ b.licences.total }} émises</div>
                </a>
                <!-- Ce qu'il faut préparer, et ce qu'on a oublié : les deux chiffres qu'on découvre
                     d'habitude quand le client appelle. -->
                <a class="tuile lien" routerLink="/licences"
                   [class.alerte]="b.licences.echeantSous30Jours > 0">
                    <div class="nombre">{{ b.licences.echeantSous30Jours }}</div>
                    <div class="quoi">Échéant sous 30 jours</div>
                </a>
                <a class="tuile lien" routerLink="/licences"
                   [class.alerte]="b.licences.jamaisEnvoyees > 0">
                    <div class="nombre">{{ b.licences.jamaisEnvoyees }}</div>
                    <div class="quoi">Émises mais jamais envoyées</div>
                </a>
            </div>

            <div class="deux-colonnes">
                <div class="carte">
                    <div class="carte-titre">Revenus</div>
                    <div class="carte-corps">
                        <div class="periode">Ce mois-ci</div>
                        @for (revenu of b.revenusDuMois; track revenu.devise) {
                            <div class="somme">
                                <span class="valeur">{{ montant(revenu.montant) }}</span>
                                <span class="devise">{{ revenu.devise }}</span>
                                <span class="secondaire">· {{ revenu.licences }} licence(s)</span>
                            </div>
                        } @empty {
                            <div class="secondaire">Aucune licence facturée ce mois-ci.</div>
                        }

                        <div class="periode" style="margin-top:1.25rem">Depuis le 1er janvier</div>
                        @for (revenu of b.revenusDeLAnnee; track revenu.devise) {
                            <div class="somme">
                                <span class="valeur">{{ montant(revenu.montant) }}</span>
                                <span class="devise">{{ revenu.devise }}</span>
                                <span class="secondaire">· {{ revenu.licences }} licence(s)</span>
                            </div>
                        } @empty {
                            <div class="secondaire">Aucune licence facturée cette année.</div>
                        }
                    </div>
                </div>

                <div class="carte">
                    <div class="carte-titre">État des licences</div>
                    <div class="carte-corps">
                        <div class="repartition">
                            <div class="part"><span>En cours</span>
                                <strong>{{ b.licences.actives }}</strong></div>
                            <div class="part"><span>À venir</span>
                                <strong>{{ b.licences.aVenir }}</strong></div>
                            <div class="part"><span>Expirées</span>
                                <strong>{{ b.licences.expirees }}</strong></div>
                            <div class="part"><span>Révoquées</span>
                                <strong>{{ b.licences.revoquees }}</strong></div>
                        </div>
                        <div class="aide" style="margin-top:1rem">
                            Une licence révoquée n'entre dans aucun revenu. Les partenaires sans
                            licence en cours : <strong>{{ b.partenaires.sansLicenceEnCours }}</strong>.
                        </div>
                    </div>
                </div>
            </div>

            <div class="carte">
                <div class="carte-titre">Douze derniers mois</div>
                <div class="carte-corps">
                    @if (mois().length > 0) {
                        <div class="histogramme">
                            @for (m of mois(); track m.mois) {
                                <div class="colonne" [pTooltip]="detail(m)" tooltipPosition="top">
                                    <div class="barre" [style.height.%]="hauteur(m)"></div>
                                    <div class="etiquette">{{ moisCourt(m.mois) }}</div>
                                </div>
                            }
                        </div>
                        <div class="aide" style="margin-top:.75rem">
                            Hauteur proportionnelle au plus fort mois
                            ({{ montant(sommet()) }} {{ mois()[0].devise }}).
                        </div>
                    } @else {
                        <div class="secondaire">Aucune licence facturée sur les douze derniers
                            mois.</div>
                    }
                </div>
            </div>

            <div class="carte">
                <div class="carte-titre">Offres qui rapportent le plus</div>
                <div class="carte-corps">
                    @for (offre of b.offresLesPlusVendues; track offre.code) {
                        <div class="offre">
                            <div class="offre-nom">
                                <div class="principal">{{ offre.libelle }}</div>
                                <div class="secondaire">{{ offre.code }} ·
                                    {{ offre.licences }} licence(s)</div>
                            </div>
                            <div class="offre-barre">
                                <div class="remplissage" [style.width.%]="part(offre.montant)"></div>
                            </div>
                            <div class="offre-montant">
                                {{ montant(offre.montant) }} <span class="devise">{{ offre.devise }}</span>
                            </div>
                        </div>
                    } @empty {
                        <div class="secondaire">Aucune licence commerciale émise pour l'instant.</div>
                    }
                    <div class="aide" style="margin-top:.75rem">
                        Classées sur le montant encaissé, non sur le nombre de licences : une offre
                        vendue dix fois à bas prix pèse moins qu'une vendue deux fois cher.
                    </div>
                </div>
            </div>
        } @else if (chargement()) {
            <div class="carte"><div class="carte-corps secondaire">Chargement…</div></div>
        } @else {
            <div class="carte"><div class="carte-corps secondaire">
                Les indicateurs n'ont pas pu être chargés.</div></div>
        }
    `,
    styles: [`
        .tuile.lien { text-decoration: none; display: block; transition: border-color .15s; }
        .tuile.lien:hover { border-color: #2c5282; }
        .tuile.alerte .nombre { color: #b45309; }

        .deux-colonnes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }

        .periode {
            font-size: .72rem; text-transform: uppercase; letter-spacing: .05em;
            color: #94a3b8; margin-bottom: .35rem;
        }
        .somme { display: flex; align-items: baseline; gap: .4rem; margin-bottom: .2rem; }
        .somme .valeur { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; }
        .somme .devise { font-size: .8rem; font-weight: 600; color: #64748b; }

        .repartition { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; }
        .part {
            display: flex; justify-content: space-between; align-items: baseline;
            border: 1px solid #e2e8f0; border-radius: .5rem; padding: .55rem .7rem;
        }
        .part span { font-size: .8rem; color: #64748b; }
        .part strong { font-size: 1.05rem; color: #1e293b; }

        .histogramme {
            display: flex; align-items: flex-end; gap: .5rem; height: 160px;
        }
        .colonne { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
        .barre {
            width: 100%; background: linear-gradient(180deg, #2c5282, #1e3a5f);
            border-radius: .3rem .3rem 0 0; margin-top: auto; min-height: 2px;
        }
        .etiquette { font-size: .66rem; color: #94a3b8; margin-top: .35rem; white-space: nowrap; }

        .offre { display: grid; grid-template-columns: 14rem 1fr 10rem; gap: 1rem;
                 align-items: center; margin-bottom: .7rem; }
        .offre-barre { background: #f1f5f9; border-radius: .3rem; height: .6rem; overflow: hidden; }
        .remplissage { background: #2c5282; height: 100%; border-radius: .3rem; min-width: 2px; }
        .offre-montant { text-align: right; font-weight: 600; color: #1e293b; }
        .offre-montant .devise { font-size: .74rem; color: #64748b; font-weight: 500; }

        @media (max-width: 900px) {
            .deux-colonnes, .repartition { grid-template-columns: 1fr; }
            .offre { grid-template-columns: 1fr; gap: .3rem; }
            .offre-montant { text-align: left; }
        }
    `]
})
export class TableauDeBordComponent implements OnInit {

    private readonly service = inject(TableauDeBordService);

    protected readonly bord = signal<TableauDeBord | undefined>(undefined);
    protected readonly chargement = signal(true);

    /**
     * Les douze mois, réduits à une seule devise.
     *
     * <p>Un histogramme mêlant des francs et des euros donnerait des barres incomparables entre
     * elles. On retient donc la devise la plus représentée, et on le dit sous le graphique.</p>
     */
    protected readonly mois = computed<MoisDeRevenu[]>(() => {
        const tous = this.bord()?.douzeDerniersMois ?? [];
        if (tous.length === 0) {
            return [];
        }
        const parDevise = new Map<string, number>();
        tous.forEach((m) => parDevise.set(m.devise, (parDevise.get(m.devise) ?? 0) + m.montant));
        const principale = [...parDevise.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return tous.filter((m) => m.devise === principale);
    });

    protected readonly sommet = computed(() =>
        Math.max(...this.mois().map((m) => m.montant), 0));

    ngOnInit(): void {
        this.service.indicateurs().subscribe({
            next: (b) => {
                this.bord.set(b);
                this.chargement.set(false);
            },
            error: () => this.chargement.set(false)
        });
    }

    protected hauteur(m: MoisDeRevenu): number {
        const sommet = this.sommet();
        return sommet > 0 ? Math.max(2, (m.montant / sommet) * 100) : 2;
    }

    /** La part d'une offre, rapportée à la plus forte — les barres se comparent entre elles. */
    protected part(montant: number): number {
        const plusForte = Math.max(
            ...(this.bord()?.offresLesPlusVendues ?? []).map((o) => o.montant), 0);
        return plusForte > 0 ? Math.max(2, (montant / plusForte) * 100) : 2;
    }

    protected montant(valeur: number): string {
        return (valeur ?? 0).toLocaleString('fr-FR');
    }

    /** « 2026-08 » → « août 26 ». */
    protected moisCourt(mois: string): string {
        const [annee, numero] = mois.split('-');
        const noms = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août',
            'sept.', 'oct.', 'nov.', 'déc.'];
        return `${noms[Number(numero) - 1]} ${annee.slice(2)}`;
    }

    protected detail(m: MoisDeRevenu): string {
        return `${this.moisCourt(m.mois)} — ${this.montant(m.montant)} ${m.devise}, `
            + `${m.licences} licence(s)`;
    }
}

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Une action offerte sur une ligne de tableau.
 *
 * <p>{@link visible} plutôt qu'un filtrage par l'appelant : une action fermée par une permission
 * se déclare au même endroit que l'action elle-même, et l'on voit d'un coup d'œil ce qui la
 * conditionne.</p>
 */
export interface ActionDeLigne {
    libelle: string;
    /** Icône PrimeIcons — « pi pi-pencil ». */
    icone: string;
    /** Vrai par défaut : une action non conditionnée n'a rien à déclarer. */
    visible?: boolean;
    /** Teinte l'entrée en rouge et la place en dernier : suppression, révocation. */
    danger?: boolean;
    executer: () => void;
}

/**
 * Les actions d'une ligne : en clair quand elles sont peu nombreuses, sous les trois points sinon.
 *
 * <p>Quatre icônes alignées dans une colonne ne se lisent pas : elles se ressemblent, leur ordre
 * varie d'un écran à l'autre, et il faut survoler chacune pour savoir ce qu'elle fait. Passé un
 * <b>seuil</b>, elles cèdent la place à un menu où chaque action porte son nom écrit.</p>
 *
 * <p>Le seuil plutôt que le menu systématique : cacher une action unique derrière deux clics
 * dessert autant que d'en aligner six. En deçà, l'icône directe reste le geste le plus court.</p>
 *
 * <p>Les actions dangereuses passent en dernier, et se distinguent — dans un menu, elles voisinent
 * avec le reste, et une suppression ne doit pas s'atteindre par mégarde.</p>
 */
@Component({
    selector: 'app-actions-ligne',
    standalone: true,
    imports: [CommonModule, ButtonModule, MenuModule, TooltipModule],
    template: `
        @if (offertes.length > 0) {
            @if (offertes.length <= seuil) {
                @for (action of offertes; track action.libelle) {
                    <p-button [icon]="action.icone" [text]="true" [rounded]="true"
                              [severity]="action.danger ? 'danger' : undefined"
                              [pTooltip]="action.libelle" tooltipPosition="top"
                              (onClick)="action.executer()"></p-button>
                }
            } @else {
                <p-button icon="pi pi-ellipsis-v" [text]="true" [rounded]="true"
                          [pTooltip]="'Actions'" tooltipPosition="top"
                          (onClick)="menu.toggle($event)"
                          [attr.aria-label]="'Actions sur cette ligne'"></p-button>
                <p-menu #menu [model]="entrees" [popup]="true" appendTo="body"></p-menu>
            }
        }
    `
})
export class ActionsLigneComponent {

    /** Au-delà, les actions passent sous les trois points. */
    @Input() seuil = 2;

    @Input({ required: true })
    set actions(actions: ActionDeLigne[]) {
        this.offertes = (actions ?? [])
            .filter((action) => action.visible !== false)
            .sort((a, b) => Number(a.danger ?? false) - Number(b.danger ?? false));
        this.entrees = this.offertes.map((action) => ({
            label: action.libelle,
            icon: action.icone,
            // Le rouge est porté par la classe et non par une propriété du menu : PrimeNG n'offre
            // pas de « severity » sur une entrée, et une suppression doit se distinguer.
            styleClass: action.danger ? 'entree-danger' : undefined,
            command: () => action.executer()
        }));
    }

    protected offertes: ActionDeLigne[] = [];
    protected entrees: MenuItem[] = [];
}

import { Directive, Input, TemplateRef, inject } from '@angular/core';

/**
 * Le rendu d'une colonne, fourni par l'écran qui l'affiche.
 *
 * <p>Un tableau générique sait disposer, paginer et filtrer ; il ne sait pas qu'un état se montre
 * en pastille verte ni qu'une raison sociale se double de sa ville en plus petit. Ce qui est propre
 * à un écran reste donc chez lui, désigné par un nom que la colonne cite.</p>
 *
 * <pre>&lt;ng-template gabaritColonne="etat" let-ligne&gt;…&lt;/ng-template&gt;</pre>
 */
@Directive({
    selector: '[gabaritColonne]',
    standalone: true
})
export class GabaritColonneDirective {

    /** Le nom cité par {@code ColonneTableau.gabarit}. */
    @Input({ alias: 'gabaritColonne', required: true }) nom = '';

    readonly modele = inject(TemplateRef);
}

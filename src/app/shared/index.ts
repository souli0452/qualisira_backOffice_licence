/**
 * Ce que les écrans partagent.
 *
 * <p>Un seul point d'entrée : un écran importe {@code ../shared} et non trois chemins, et l'ajout
 * d'une pièce commune ne demande pas de retoucher les imports de tous ceux qui s'en servaient
 * déjà.</p>
 */
export { ActionsLigneComponent } from './actions-ligne.component';
export type { ActionDeLigne } from './actions-ligne.component';
export { GabaritColonneDirective } from './gabarit-colonne.directive';
export { TableauComponent } from './tableau.component';
export type { ColonneTableau } from './tableau.component';

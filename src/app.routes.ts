import { Routes } from '@angular/router';

import { permissionGuard } from './app/services/permission.guard';
import { sessionGuard } from './app/services/session.guard';

/**
 * Des écrans indépendants, aucun imbriqué : chacun est un référentiel complet, et l'on ne navigue
 * pas de l'un à l'autre en cours de saisie. Tous sont fermés tant qu'aucune session n'est ouverte.
 *
 * <p>Les écrans d'administration exigent en outre une permission. Le serveur refuse de toute façon
 * chaque appel dont elle manque : le garde évite seulement d'ouvrir un écran qui ne se remplira
 * jamais.</p>
 */
export const appRoutes: Routes = [
    { path: '', redirectTo: 'licences', pathMatch: 'full' },
    {
        path: 'connexion',
        title: 'Connexion',
        loadComponent: () => import('./app/pages/connexion.component').then((m) => m.ConnexionComponent)
    },
    {
        path: 'tableau-de-bord',
        title: 'Tableau de bord',
        canActivate: [permissionGuard],
        data: { permission: 'TABLEAU_DE_BORD_LIRE' },
        loadComponent: () => import('./app/pages/tableau-de-bord.component')
            .then((m) => m.TableauDeBordComponent)
    },
    {
        path: 'licences',
        title: 'Licences',
        canActivate: [sessionGuard],
        loadComponent: () => import('./app/pages/licences.component').then((m) => m.LicencesComponent)
    },
    {
        path: 'partenaires',
        title: 'Partenaires',
        canActivate: [sessionGuard],
        loadComponent: () => import('./app/pages/partenaires.component').then((m) => m.PartenairesComponent)
    },
    {
        path: 'offres',
        title: "Offres d'abonnement",
        canActivate: [sessionGuard],
        loadComponent: () => import('./app/pages/offres.component').then((m) => m.OffresComponent)
    },
    {
        path: 'cle',
        title: 'Clé de vérification',
        canActivate: [sessionGuard],
        loadComponent: () => import('./app/pages/cle.component').then((m) => m.CleComponent)
    },
    {
        path: 'comptes',
        title: 'Comptes',
        canActivate: [permissionGuard],
        data: { permission: 'UTILISATEUR_LIRE' },
        loadComponent: () => import('./app/pages/comptes.component').then((m) => m.ComptesComponent)
    },
    {
        path: 'roles',
        title: 'Rôles & permissions',
        canActivate: [permissionGuard],
        data: { permission: 'HABILITATION_LIRE' },
        loadComponent: () => import('./app/pages/roles.component').then((m) => m.RolesComponent)
    },
    {
        path: 'reglages',
        title: 'Réglages',
        canActivate: [permissionGuard],
        data: { permission: 'REGLAGE_LIRE' },
        loadComponent: () => import('./app/pages/reglages.component').then((m) => m.ReglagesComponent)
    },
    {
        path: 'journal',
        title: 'Journal des actions',
        canActivate: [permissionGuard],
        data: { permission: 'JOURNAL_LIRE' },
        loadComponent: () => import('./app/pages/journal.component').then((m) => m.JournalComponent)
    },
    {
        path: 'mon-compte',
        title: 'Mon compte',
        canActivate: [sessionGuard],
        loadComponent: () => import('./app/pages/mon-compte.component').then((m) => m.MonCompteComponent)
    },
    { path: '**', redirectTo: 'licences' }
];

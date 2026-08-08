import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

import { appRoutes } from './app.routes';
import { intercepteurAntiRejeu } from './app/services/anti-rejeu.interceptor';

/**
 * Le bleu QualiSira, repris à l'identique du produit : ces deux applications s'adressent aux
 * mêmes personnes, et rien ne justifierait qu'elles n'aient pas la même apparence.
 */
const PresetQualiSira = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#ebf1f7',
            100: '#d7e3f0',
            200: '#afc7e1',
            300: '#87abcf',
            400: '#5f8fbe',
            500: '#1e3a5f',
            600: '#1a3353',
            700: '#162a45',
            800: '#122238',
            900: '#0e1a2a'
        }
    }
});

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({
            anchorScrolling: 'enabled',
            scrollPositionRestoration: 'enabled'
        })),
        // `withFetch` et les identifiants de session : le back-office est protégé, chaque appel
        // doit porter la session ouverte auprès du serveur de licences.
        provideHttpClient(withFetch(), withInterceptors([intercepteurAntiRejeu])),
        provideAnimationsAsync(),
        MessageService,
        ConfirmationService,
        providePrimeNG({
            theme: { preset: PresetQualiSira, options: { darkModeSelector: '.app-dark' } },
            translation: {
                firstDayOfWeek: 1,
                dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
                dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
                dayNamesMin: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
                monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
                    'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
                monthNamesShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep',
                    'Oct', 'Nov', 'Déc'],
                today: "Aujourd'hui",
                clear: 'Effacer',
                dateFormat: 'dd/mm/yy',
                weekHeader: 'Sem'
            }
        })
    ]
};

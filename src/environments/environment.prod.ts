/**
 * Production — le back-office est servi par le service de licences lui-même.
 *
 * <p>Une seule origine : pas de CORS à ouvrir, pas de relais à router, et une adresse de retour
 * vers Keycloak qu'aucun intermédiaire n'a pu réécrire.</p>
 */
export const environment = {
    production: true,

    /**
     * Vide, donc tous les appels sont relatifs.
     *
     * <p>C'est ce qui permet de promouvoir le <b>même artefact</b> de la recette à la production
     * après validation : une adresse inscrite dans le bundle devrait être connue à la
     * compilation, et obligerait à reconstruire pour chaque environnement.</p>
     */
    apiUrl: ''
};

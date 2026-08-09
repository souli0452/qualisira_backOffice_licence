/**
 * Développement — le back-office tourne sur son propre serveur (port 4300), l'API sur 8099.
 *
 * <p>Deux origines, donc : le service de licences les accepte par sa configuration CORS
 * ({@code LICENCES_CORS}, qui vaut « http://localhost:4300 » par défaut). C'est lui qui décide,
 * plutôt qu'un relais local dont les réglages divergent d'un poste à l'autre.</p>
 *
 * <p>La session traverse sans encombre : le cookie est en {@code SameSite=Lax}, et deux ports du
 * même hôte relèvent du même site — seul un autre domaine l'aurait retenu.</p>
 */
export const environment = {
    production: false,

    /**
     * Racine du service de licences.
     *
     * <p>Absolue ici, vide en production : là-bas, le service sert lui-même le back-office, et
     * une adresse en dur y désignerait un serveur qui n'est pas celui qu'on a ouvert.</p>
     */
    apiUrl: 'http://localhost:8099'
};

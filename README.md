# QualiSira — Back-office des licences

Interface d'administration des partenaires, des offres d'abonnement et des licences.
Service associé : **`qualisira-licences`** (Spring Boot), projet séparé.

> Outil interne. Il n'est jamais déployé chez un partenaire.

## Démarrage

Le service de licences doit tourner sur le port 8099.

```bash
npm install
npm start            # http://localhost:4300
```

Le serveur de développement relaie `/api`, `/login`, `/logout` et `/oauth2` vers `localhost:8099`
(`proxy.conf.json`) : tout paraît venir de la même origine, et aucune configuration CORS n'est
nécessaire en développement.

Connexion avec le **super administrateur** créé par le service à son premier démarrage (`admin`,
et le mot de passe annoncé dans son journal), ou par Keycloak selon son réglage. C'est ce compte
qui ouvre ceux des autres, depuis l'écran **Comptes**.

## Construction

```bash
npm run build        # dist/backoffice-licences
```

À servir par nginx en publiant `/api` vers le service de licences — même origine de préférence :
la session est portée par un cookie, et une origine distincte oblige à déclarer
`LICENCES_CORS` côté service et à passer les cookies en `SameSite=None; Secure`.

## Les écrans

| Écran | Ce qu'on y fait |
|---|---|
| **Licences** | émettre, consulter, envoyer par courriel, télécharger le `.lic`, révoquer |
| **Partenaires** | le fichier des clients ; le code est immuable une fois créé |
| **Offres d'abonnement** | le catalogue commercial : durée, utilisateurs, modules |
| **Clé de vérification** | la clé publique à embarquer dans QualiSira, et la relecture d'une licence |
| **Comptes** | ouvrir, suspendre et supprimer les comptes ; leur attribuer des rôles, réinitialiser un mot de passe |
| **Rôles & permissions** | ce que chaque rôle autorise, action par action |
| **Mon compte** | ses propres droits, et le changement de son mot de passe |

Les deux écrans d'administration n'apparaissent dans le rail qu'à qui en a la permission
(`UTILISATEUR_LIRE`, `HABILITATION_LIRE`). Ce masquage est un **confort d'affichage** : c'est le
serveur qui refuse les appels, et lui seul — proposer un écran qui répondra « cette action ne vous
est pas ouverte » ne renseigne personne.

## Ce qu'il faut savoir de l'écran des licences

Une licence **ne se modifie pas** : elle est signée à l'émission, et c'est le jeton qui fait foi
chez le partenaire. D'où l'absence de tout bouton « modifier » — prolonger un abonnement consiste
à en émettre une nouvelle.

Une offre est un **modèle de saisie**, pas une référence vivante : ses valeurs sont recopiées dans
la licence au moment de l'émission. Retoucher le catalogue ne change donc rien à ce qui a déjà été
vendu.

La colonne d'état signale les licences **non envoyées** : c'est l'oubli qu'on découvre autrement
quand le client appelle.

## Comptes et permissions

Un compte ne porte aucun droit en propre : tout lui vient des **rôles** qu'on lui attribue, et un
rôle n'est qu'un paquet de **permissions**. Ouvrir une action à un profil de plus se fait donc en
cochant une case dans l'écran des rôles — sans toucher au code du serveur.

Le mot de passe d'un compte créé ici est **tiré au hasard par le serveur** et affiché une seule
fois, dans une fenêtre à recopier avant de fermer : la base n'en garde que l'empreinte. Son
titulaire est invité à le changer dès sa première connexion, sans quoi « émise par » ne désigne
personne avec certitude — celui qui a créé le compte connaît encore le mot de passe.

Le rôle `SUPER_ADMIN` se consulte mais ne se modifie pas : ses permissions lui sont rendues à
chaque démarrage du service, et lui en retirer refermerait la gestion des comptes sans laisser
personne pour la rouvrir.

## Technique

Angular 19 · PrimeNG 19 · même préréglage de thème que le produit (bleu marine `#1e3a5f`,
Poppins). Composants autonomes, écrans chargés à la demande.

L'authentification repose sur un **cookie de session** : rien n'est conservé dans le stockage
local, qu'un script tiers pourrait lire. Un intercepteur joint le jeton anti-rejeu aux écritures
et ramène à l'écran de connexion dès qu'une session expire — plutôt qu'un message d'erreur devant
un formulaire rempli.

# Déploiement du back-office

## Deux environnements, une seule variable

Ce front est une application Angular compilée en **fichiers statiques**. Ce qui change d'un
environnement à l'autre tient en une valeur, `apiUrl`, choisie **à la compilation** :

| Fichier | `apiUrl` | Quand |
| --- | --- | --- |
| `src/environments/environment.ts` | `http://localhost:8099` | développement — `ng serve` sur 4300 |
| `src/environments/environment.prod.ts` | *(vide)* | production — appels relatifs |

`ng build` prend la seconde ; `ng build --configuration development` et `ng serve` prennent la
première. La substitution est déclarée dans `angular.json` (`fileReplacements`).

**En production, l'adresse est vide et tous les appels sont relatifs** : le service de licences
sert lui-même le back-office, comme le disait déjà son code — *« le back-office est servi par
cette application »*. C'est ce qui permet de promouvoir le **même artefact** de la recette à la
production après validation.

Ce montage n'est pas une commodité. En production, il fait disparaître trois problèmes plutôt que
de les configurer :

- **Pas de CORS.** La session est portée par un cookie `HttpOnly` en `SameSite=Lax` : servi
  ailleurs, il n'accompagnerait pas les appels, et il faudrait ouvrir des origines à la main.
- **Pas de relais à régler.** Rien à router vers l'API : elle est au même endroit.
- **Pas d'en-tête `Host` à préserver.** Spring déduit de cet en-tête l'adresse de retour qu'il
  envoie à Keycloak. Avec un relais devant, la remplacer fait refuser la connexion par le
  royaume — sur un « Invalid parameter: redirect_uri » que rien ne relie à sa cause, et qui
  n'apparaît qu'au passage à Keycloak, jamais en mode local. Sans relais, la question ne se pose
  pas.

---

## Construire

```bash
npm ci
npx ng build
```

Sortie : `dist/backoffice-licences/browser/` — c'est **ce dossier**, et non son parent.

Construit avec Node 22+ et Angular 19.

---

## Livrer

Recopier ce dossier là où le service de licences peut le lire, et le lui désigner :

```bash
LICENCES_FRONT=/var/www/backoffice-licences
```

Le service s'en occupe ensuite : il sert les fichiers, et **replie sur `index.html`** tout ce qui
ressemble à une route — sans quoi rafraîchir sur `/licences` ou ouvrir un lien vers `/journal`
donnerait un 404, et l'utilisateur conclurait que l'application est cassée.

Ce qui porte une extension en est exclu : une image absente rend un 404, et non la page
d'accueil. Recevoir du HTML là où on attend une image est une panne bien plus difficile à lire
qu'un fichier manquant.

Sans `LICENCES_FRONT`, les fichiers sont cherchés dans le jar (`classpath:/static/`), pour qui
préfère tout empaqueter ensemble.

**Le front se met donc à jour sans reconstruire le serveur** : on remplace le dossier, on
rafraîchit.

---

## Développer

```bash
npm start        # ng serve, sur http://localhost:4300
```

L'API reste sur 8099 : deux origines, donc, et c'est **le service qui les accepte** par sa
configuration CORS — `LICENCES_CORS` vaut `http://localhost:4300` par défaut. Un relais local
(`proxy.conf.json`) faisait ce travail auparavant ; il a été retiré, parce que ses réglages
divergeaient d'un poste à l'autre et qu'il réécrivait l'en-tête `Host`, cassant le flot Keycloak
sans prévenir.

La session traverse sans encombre : le cookie est en `SameSite=Lax`, et deux ports du même hôte
relèvent du même site — seul un autre domaine l'aurait retenu.

> **Une réserve, pour le flot Keycloak.** Depuis `ng serve`, la connexion par le royaume renvoie
> le navigateur sur `:8099` et non sur `:4300` : c'est le service qui reçoit le retour. Pour
> l'éprouver dans les conditions réelles, construire et se placer sur le service seul :
>
> ```bash
> npx ng build
> LICENCES_FRONT=…/dist/backoffice-licences/browser  mvn spring-boot:run   # tout sur :8099
> ```

---

## Ce que le service attend en face

| Variable | Valeur attendue | Sinon |
| --- | --- | --- |
| `LICENCES_FRONT` | le dossier livré | les fichiers sont cherchés dans le jar |
| `LICENCES_COOKIE_SECURE` | `true` derrière HTTPS | le cookie de session circule aussi en clair |
| `LICENCES_AUTH` | `keycloak` en production | l'authentification reste locale |

`LICENCES_CORS` ne sert plus dans ce montage : il n'y a qu'une origine.

Si un répartiteur de charge ou un terminateur TLS est placé devant, il doit **conserver
l'en-tête `Host`** (`proxy_set_header Host $host;` sous nginx) — pour la raison exposée plus
haut. Et le téléversement d'un logo depuis l'écran des réglages voyage en base64 :
`client_max_body_size 4m;` évite un refus peu parlant.

# Déploiement du back-office

## Il n'y a aucune variable d'environnement, et aucun serveur web à installer

Ce front est une application Angular compilée en **fichiers statiques**. Il ne lit aucune
configuration au démarrage, et il n'existe volontairement pas de fichier `environment.ts` : tous
ses appels sont **relatifs** — `/api`, `/oauth2`, `/logout`.

Il n'est pas non plus servi par un serveur à lui. **C'est le service de licences qui le sert**,
comme le disait déjà son code : *« le back-office est servi par cette application »*.

Ce montage n'est pas une commodité. Il fait disparaître trois problèmes plutôt que de les
configurer :

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
npx ng build --watch        # reconstruit à chaque enregistrement
```

et lancer le service de licences en lui désignant la sortie :

```bash
LICENCES_FRONT=…/backOffice_licences/dist/backoffice-licences/browser  mvn spring-boot:run
```

Tout est alors sur `http://localhost:8099`. Il n'y a plus de `ng serve` ni de `proxy.conf.json` :
le serveur de développement d'Angular servait le front sur un autre port que l'API, ce qui
imposait un relais — et ce relais réécrivait l'en-tête `Host`, cassant le flot Keycloak sans
prévenir.

Un rafraîchissement du navigateur suffit à voir un changement.

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

# Déploiement du back-office

## Il n'y a aucune variable d'environnement

Ce front est une application Angular compilée en **fichiers statiques**. Il ne lit aucune
configuration au démarrage, et il n'existe volontairement pas de fichier `environment.ts` : tous
ses appels sont **relatifs** — `/api`, `/oauth2`, `/logout`.

C'est un choix, pas un oubli. Une adresse de serveur inscrite dans le bundle devrait être connue
au moment de compiler, ce qui obligerait à reconstruire l'application pour chaque environnement —
et le même artefact ne pourrait plus être promu de la recette à la production après validation.

Ce qui se configure au déploiement n'est donc pas dans l'application : **c'est le serveur qui la
sert**. Il a deux responsabilités, et la seconde est piégeuse.

---

## 1. Construire

```bash
npm ci
npx ng build
```

Sortie : `dist/backoffice-licences/browser/` — c'est **ce dossier**, et non son parent, qu'il faut
servir.

Construit avec Node 22+ et Angular 19.

---

## 2. Servir — deux règles

### a. Repli SPA sur `index.html`

Le routage est côté navigateur. Sans repli, un rafraîchissement sur `/licences` ou un lien
partagé vers `/journal` demande au serveur un fichier qui n'existe pas : il répond 404, et
l'utilisateur conclut que l'application est cassée.

### b. Relais vers le back-office, **en conservant l'en-tête `Host`**

Le front et l'API doivent être servis sous la **même origine** : la session est portée par un
cookie `HttpOnly` en `SameSite=Lax`, qui n'accompagnerait pas des appels vers un autre domaine.

Chemins à relayer vers le service de licences : `/api`, `/oauth2`, `/login`, `/logout`.

> **Le piège.** Spring déduit l'adresse de retour envoyée à Keycloak (`redirect_uri`) de
> l'en-tête `Host` qu'il reçoit. Si le relais le remplace par celui du service — ce que fait
> `proxy_pass` par défaut —, Spring réclame une adresse interne que le royaume refusera, avec un
> « Invalid parameter: redirect_uri » que rien ne relie à la configuration du proxy.
>
> D'où `proxy_set_header Host $host;` ci-dessous. En mode d'authentification locale, l'oubli ne
> se voit pas : il n'apparaît que le jour où l'on passe à Keycloak.

---

## Exemple nginx

```nginx
server {
    listen 443 ssl http2;
    server_name licences.qualisira.com;

    ssl_certificate     /etc/ssl/certs/licences.crt;
    ssl_certificate_key /etc/ssl/private/licences.key;

    root /var/www/backoffice-licences/browser;
    index index.html;

    # Les fichiers portent une empreinte dans leur nom : ils ne changent jamais sous
    # la même adresse, et se mettent donc en cache sans réserve.
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # index.html, lui, n'est jamais mis en cache : c'est lui qui désigne les
    # empreintes du moment. Mis en cache, une mise en production resterait
    # invisible jusqu'à expiration.
    location = /index.html {
        add_header Cache-Control "no-store";
    }

    # Repli SPA : le routage est côté navigateur.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Le service de licences, sous la même origine que le front.
    location ~ ^/(api|oauth2|login|logout) {
        proxy_pass http://licences-api:8099;

        # ⚠ L'en-tête d'origine est CONSERVÉ : Spring en déduit l'adresse de retour
        # envoyée à Keycloak. Le remplacer fait refuser la connexion par le royaume.
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Le téléversement d'un logo depuis l'écran des réglages voyage en base64 :
        # la limite par défaut de 1 Mo le refuserait.
        client_max_body_size 4m;
    }
}

# HTTP ne sert qu'à rediriger : la session est en cookie « secure ».
server {
    listen 80;
    server_name licences.qualisira.com;
    return 301 https://$host$request_uri;
}
```

---

## Ce que le back-office attend en face

Trois réglages du service de licences doivent s'accorder avec ce qui précède — voir son
`.env.example` :

| Variable | Valeur attendue | Sinon |
| --- | --- | --- |
| `LICENCES_COOKIE_SECURE` | `true` | le cookie de session circule aussi en clair |
| `LICENCES_CORS` | l'origine servie ici | les appels du navigateur sont refusés |
| `LICENCES_AUTH` | `keycloak` en production | l'authentification reste locale |

Le `LICENCES_CORS` n'est utile que si le front est servi depuis une autre origine que l'API. Dans
la configuration ci-dessus il ne l'est pas — et c'est préférable : même origine, pas de CORS, et
un cookie qui accompagne chaque appel sans réserve.

---

## En développement

`proxy.conf.json` fait le même travail que le bloc nginx :

```bash
npm start        # sert sur http://localhost:4300, relaie vers 8099
```

Il relaie `/api`, `/oauth2`, `/login` et `/logout` **sans `changeOrigin`** — pour la raison
exposée plus haut : l'en-tête `Host` doit rester celui du front, faute de quoi le flot Keycloak
échoue.

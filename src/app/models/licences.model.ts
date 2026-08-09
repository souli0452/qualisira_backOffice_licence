/**
 * Contrat du service de licences.
 *
 * <p>Ces noms sont ceux que rend le serveur : les recopier fidèlement évite le mappage
 * intermédiaire dont personne ne se souvient six mois plus tard.</p>
 */

export interface Partenaire {
    id?: string;
    /** Inscrit dans chaque licence : immuable une fois le partenaire créé. */
    code: string;
    raisonSociale: string;
    sigle?: string | null;
    secteurActivite?: string | null;
    contactNom?: string | null;
    contactEmail?: string | null;
    contactTelephone?: string | null;
    adresse?: string | null;
    ville?: string | null;
    pays?: string | null;
    notes?: string | null;
    actif: boolean;
    creeLe?: string;
    creePar?: string | null;
}

/**
 * L'unité dans laquelle s'exprime la durée d'une offre.
 *
 * <p>Une durée et son unité, plutôt que deux champs dont un seul s'applique : « 7 » et « jours »
 * ne laissent aucune place au doute.</p>
 */
export type UniteDeDuree = 'JOURS' | 'MOIS';

export interface OffreAbonnement {
    id?: string;
    code: string;
    libelle: string;
    description?: string | null;
    /** Durée couverte, exprimée dans son unité — 7 JOURS, 12 MOIS. */
    duree: number;
    uniteDuree: UniteDeDuree;
    /** 0 vaut « sans limite ». */
    utilisateursMax: number;
    modules: string[];
    /**
     * Prix de l'offre, en nombre — c'est lui qui s'additionne dans le tableau de bord.
     *
     * <p>Nul veut dire « à négocier », ce qui se distingue d'un zéro affirmant la gratuité.</p>
     */
    montant?: number | null;
    /** Code ISO — « XOF », « EUR ». Additionner des sommes sans devise ne veut rien dire. */
    devise: string;
    actif: boolean;
}

export type StatutLicence = 'ACTIVE' | 'A_VENIR' | 'EXPIREE' | 'REVOQUEE';

export interface Licence {
    id: string;
    reference: string;
    partenaireId: string;
    partenaireCode: string;
    partenaireNom: string;
    offre: string;
    type: 'COMMERCIALE' | 'ESSAI';
    statut: StatutLicence;
    debut: string;
    fin: string;
    /** Négatif une fois le terme passé : « expirée depuis 12 jours » se lit directement. */
    joursRestants: number;
    utilisateursMax: number;
    /** Montant facturé, figé à l'émission. Nul pour un essai, ou un prix négocié hors outil. */
    montant?: number | null;
    devise?: string | null;
    modules: string[];
    jeton: string;
    emiseLe: string;
    emisePar: string | null;
    motifRevocation: string | null;
    envoyeeLe: string | null;
    envoyeeA: string | null;
}

export interface DemandeDeLicence {
    partenaireId: string;
    offreId?: string | null;
    debut?: string | null;
    dureeMois?: number | null;
    dureeJours?: number | null;
    utilisateursMax?: number | null;
    modules?: string[];
}

export interface ModuleVendable {
    code: string;
    libelle: string;
    description: string;
}

export interface ContenuDeLicence {
    ref: string;
    cli: string;
    nom: string;
    deb: string;
    fin: string;
    mod: string[];
    usr: number;
    typ: string;
    edt: string;
}

/**
 * Ce que l'écran de connexion apprend avant d'être entré : par où passe l'authentification.
 *
 * <p>Rien de plus n'est divulgué — un simple regard sur l'écran l'apprendrait déjà.</p>
 */
export interface ModeDAuthentification {
    /** « local » ou « keycloak ». */
    mode: string;
    /** Le même renseignement, déjà tranché : l'écran n'a pas à comparer des chaînes. */
    keycloak: boolean;
}

export interface Session {
    utilisateur: string;
    nomComplet?: string | null;
    mode: string;
    deconnexionPossible: boolean;
    /** Codes des rôles portés — « SUPER_ADMIN », « EDITEUR ». */
    roles: string[];
    /**
     * Ce que la session ouvre, action par action. L'écran s'en sert pour masquer ce qui est
     * fermé ; le serveur refuse de toute façon l'appel, et c'est lui qui tranche.
     */
    permissions: string[];
    superAdmin: boolean;
    /** Vrai tant que le mot de passe est celui remis par l'administrateur. */
    doitChangerMotDePasse: boolean;
}

/* ------------------------------------------------------------------ habilitations */

export interface Permission {
    /** Le code contrôlé côté serveur — « LICENCE_EMETTRE ». */
    code: string;
    /** Regroupement d'affichage — « Licences », « Comptes ». */
    domaine: string;
    libelle: string;
}

export interface Role {
    id?: string;
    /** Immuable une fois le rôle créé : il désigne aussi le rôle côté Keycloak. */
    code: string;
    libelle: string;
    description?: string | null;
    permissions: string[];
    /** Rôle fourni par l'application : ni supprimable, ni vidable. */
    systeme: boolean;
    /** Nombre de comptes qui le portent. */
    comptes: number;
}

export interface Utilisateur {
    id?: string;
    identifiant: string;
    nomComplet?: string | null;
    email?: string | null;
    roles: string[];
    /** Les permissions de tous ses rôles réunies — calculées par le serveur. */
    permissions: string[];
    actif: boolean;
    superAdmin: boolean;
    doitChangerMotDePasse: boolean;
    creeLe?: string;
    creePar?: string | null;
    derniereConnexion?: string | null;
}

export interface DemandeDeCompte {
    identifiant: string;
    nomComplet?: string | null;
    email?: string | null;
    roles: string[];
    /** Vide : le serveur en tire un au hasard et le rend une seule fois. */
    motDePasse?: string | null;
    actif?: boolean;
}

export interface CompteCree {
    utilisateur: Utilisateur;
    /** Rendu une seule fois, et seulement s'il a été tiré au hasard. */
    motDePasseProvisoire: string | null;
}

/* ------------------------------------------------------------------ réglages */

/**
 * Nature de la valeur d'un réglage — l'écran s'en sert pour présenter le bon champ.
 *
 * <p>Sans elle, tout serait une chaîne libre : on saisirait un logo dans un champ texte et une
 * adresse de courriel sans que rien ne prévienne avant l'envoi.</p>
 */
export type TypeParametre = 'TEXTE' | 'COURRIEL' | 'TELEPHONE' | 'URL' | 'IMAGE';

/**
 * Un réglage de l'application : ce qui figure au bas des courriels de licence.
 *
 * <p>La liste des clés appartient au serveur, qui les sème au démarrage : l'écran ne peut ni en
 * créer ni en supprimer, seulement en changer la valeur.</p>
 */
export interface Parametre {
    id: string;
    /** L'identité du réglage, citée par le serveur — « COURRIEL_CONTACT_EMAIL ». */
    cle: string;
    /** Vide tant que personne ne l'a renseigné ; la ligne est alors omise du pied de courriel. */
    valeur?: string | null;
    libelle: string;
    description?: string | null;
    type: TypeParametre;
    modifieLe?: string | null;
    modifiePar?: string | null;
}


/* ------------------------------------------------------------------ pagination */

/**
 * Une page de résultats, telle que le serveur la rend.
 *
 * <p>La pagination est faite par le serveur, et la recherche avec elle : filtrer côté navigateur
 * ne porterait que sur la page affichée, et une ligne absente de celle-ci passerait pour
 * inexistante.</p>
 */
export interface PageVue<T> {
    contenu: T[];
    /** Numéro de la page rendue, à partir de 0. */
    page: number;
    taille: number;
    /** Nombre total de lignes, toutes pages confondues — c'est lui qu'affiche la pagination. */
    total: number;
    pages: number;
}

/** Ce qu'un tableau demande au serveur quand on tourne une page ou qu'on cherche. */
export interface DemandeDePage {
    page: number;
    taille: number;
    recherche?: string;
}

/**
 * Un partenaire tel que la liste le montre : l'état de ses licences est calculé par le serveur.
 *
 * <p>Il l'était côté écran en parcourant toutes les licences — ce qui ne survit pas à la
 * pagination : le compte n'aurait plus porté que sur la page chargée.</p>
 */
export interface PartenaireVue extends Partenaire {
    nbLicences: number;
    licenceActiveFin?: string | null;
}

/* ------------------------------------------------------------------ journal */

/**
 * Une action inscrite au journal.
 *
 * <p>Le corps des requêtes n'y figure jamais : il porte des mots de passe à la création d'un
 * compte comme à sa réinitialisation. On sait ce qui a été fait et sur quoi, jamais avec quelles
 * valeurs.</p>
 */
export interface EntreeDeJournal {
    id: string;
    quand: string;
    /** « anonyme » pour une tentative de connexion refusée. */
    auteur: string;
    action: string;
    objet?: string | null;
    objetId?: string | null;
    requete: string;
    abouti: boolean;
    /** Le motif du refus, tel que l'utilisateur l'a lu. */
    motif?: string | null;
    adresse?: string | null;
    /** Durée en millisecondes. */
    duree: number;
}

/* ------------------------------------------------------------------ tableau de bord */

/** Un revenu, toujours accompagné de sa devise : des sommes sans monnaie ne s'additionnent pas. */
export interface Revenu {
    devise: string;
    montant: number;
    licences: number;
}

export interface MoisDeRevenu extends Revenu {
    /** Format « 2026-08 » : l'écran ordonne sans avoir à interpréter une date. */
    mois: string;
}

export interface OffreVendue {
    code: string;
    libelle: string;
    licences: number;
    montant: number;
    devise: string;
}

export interface TableauDeBord {
    partenaires: { total: number; actifs: number; sansLicenceEnCours: number };
    licences: {
        total: number; actives: number; aVenir: number; expirees: number;
        revoquees: number; echeantSous30Jours: number; jamaisEnvoyees: number;
    };
    revenusDuMois: Revenu[];
    revenusDeLAnnee: Revenu[];
    douzeDerniersMois: MoisDeRevenu[];
    offresLesPlusVendues: OffreVendue[];
    /** Licences facturables sans montant : elles comptent pour zéro dans les revenus. */
    licencesSansMontant: number;
}

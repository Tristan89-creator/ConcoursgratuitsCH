# ConcoursgratuitsCH v1.1 — découverte automatique sans serveur dédié

## Nouveauté
Une collecte Python lit des résultats RSS publics (Google News) en français, allemand et italien, puis produit `discoveries.json`. Les résultats sont des **pistes non vérifiées**, et non des concours certifiés gratuits, ouverts ou valides. L'application filtre par langue/mot-clé, permet d'ouvrir le lien et de l'ajouter au suivi. Aucun profil personnel n'est envoyé au script.

## Activer gratuitement avec GitHub Pages + Actions
1. Créer un dépôt GitHub et y placer **le contenu du dossier ConcoursgratuitsCH à la racine**, y compris `.github/workflows/discover.yml` (dossier caché).
2. Dans Settings > Pages, publier depuis la branche principale, dossier `/ (root)`.
3. Dans Settings > Actions > General, autoriser les workflows; dans Workflow permissions, accorder `Read and write permissions` si nécessaire. Les paramètres et quotas dépendent du compte et du dépôt.
4. Dans Actions, lancer `Update concours discovery` > `Run workflow` une première fois. Le script écrit `discoveries.json` si des résultats sont disponibles. Ensuite GitHub Actions essaie deux exécutions par jour (planification non garantie à l'heure exacte).
5. Ouvrir l'URL GitHub Pages dans Chrome Android, puis installer depuis le menu du navigateur.

Si la collecte ne renvoie rien ou si le service RSS devient indisponible, le catalogue conserve le dernier contenu non vide. Le fichier fourni initialement est vide : **aucune découverte réelle n'est incluse dans le ZIP**. Les résultats sont susceptibles de contenir des articles informatifs et des concours expirés. Aucun CAPTCHA n'est détecté ou résolu; aucun formulaire n'est soumis automatiquement. Sans hébergement et Actions, la collecte ne se déclenche pas toute seule.

## Confidentialité
Le profil et l'historique sont conservés dans le stockage local du navigateur, non chiffré. Exporter régulièrement ses données. Ne pas utiliser sur un appareil partagé.

## Test local
`python -m http.server 8000` dans ce dossier, puis ouvrir http://localhost:8000. Pour tester la collecte : `python discover.py` (connexion Internet nécessaire).

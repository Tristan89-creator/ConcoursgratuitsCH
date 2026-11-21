# ConcoursgratuitsCH v1.3 — mise à jour

1. Dans le dépôt GitHub `tristan89-creator/ConcoursgratuitsCH`, remplacer **uniquement** `index.html`, `app.js`, `sw.js`, `discover.py` et `.github/workflows/discover.yml` par les versions du ZIP. Ne pas réimporter `discoveries.json` : il contient le catalogue actuel et serait écrasé.
2. Vérifier que les fichiers sont à la racine, sauf `discover.yml` qui doit rester dans `.github/workflows/`.
3. Commit changes, puis attendre le déploiement GitHub Pages.
4. Dans Actions → Update concours discovery → Run workflow, lancer la recherche sur `main` et vérifier `discoveries.json`.
5. Sur Android, fermer puis rouvrir la PWA. Le service worker v1.3 utilise un nouveau cache. Si l'ancien affichage persiste, ouvrir d'abord l'adresse du site dans Chrome, sans supprimer les données du site.

## Confidentialité
Le coffre chiffré et ses identifiants de stockage restent inchangés. Aucun profil n'est transmis par le programme de découverte. Le presse-papiers est une fonction du téléphone, non un coffre sécurisé. La copie est déclenchée par l'utilisateur.

## Limites
La collecte utilise des flux RSS d'actualités publics. Elle repère des liens **potentiels**, pas une liste garantie de concours actifs et gratuits. Les catégories sont déterminées à partir des titres, avec erreurs possibles. La PWA ne remplit pas directement les formulaires de sites tiers et ne soumet aucune participation. Les conditions de chaque organisateur doivent être vérifiées.

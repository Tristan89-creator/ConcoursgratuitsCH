# ConcoursgratuitsCH 1.2 — Sécurité du profil

- Profil chiffré localement avec AES-256-GCM et clé dérivée du mot de passe par PBKDF2-SHA256 (310 000 itérations).
- Le mot de passe est requis à chaque ouverture du coffre et n’est pas enregistré en stockage persistant.
- Les concours restent enregistrés localement sans chiffrement; les sauvegardes exportées contiennent les concours en clair et le profil chiffré.
- Lors de la première création du coffre, l’ancien profil local en clair est migré puis supprimé de la clé `concoursch-v1`.
- Ne pas importer une ancienne sauvegarde contenant un profil en clair.
- Ne jamais mettre de coordonnées personnelles dans GitHub.
- Le chiffrement ne protège pas contre un code JavaScript malveillant servi depuis le même site pendant que le profil est déverrouillé, ni contre les données copiées dans le presse-papiers.
- Si le mot de passe est perdu, il n’existe pas de récupération.
- Avant de saisir de vraies données, vérifier le déploiement et tester avec un faux profil.

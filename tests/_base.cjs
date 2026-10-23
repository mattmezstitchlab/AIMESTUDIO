// Référence des contrôles « fichiers intacts » : la branche visée par la PR (GitHub Actions),
// ou AIME_BASE pour un contrôle local (ex. AIME_BASE=origin/main npm test).
// Sans référence (travail direct sur main), ces contrôles n'ont pas de sens et ne s'appliquent pas.
module.exports=function base(){
 const b=process.env.AIME_BASE||(process.env.GITHUB_BASE_REF?'origin/'+process.env.GITHUB_BASE_REF:'');
 if(!b)throw new Error('aucune référence de comparaison');
 if(!/^[\w./-]+$/.test(b))throw new Error('référence invalide');
 return b};

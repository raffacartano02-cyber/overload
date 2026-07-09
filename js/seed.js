// Libreria esercizi predefinita e gruppi muscolari

export const GROUPS = [
  'Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti',
  'Quadricipiti', 'Femorali', 'Glutei', 'Polpacci', 'Addome', 'Avambracci', 'Altro'
];

const ex = (id, name, group) => ({ id, name, group });

export const SEED = [
  // Petto
  ex('sx-panca-piana', 'Panca piana bilanciere', 'Petto'),
  ex('sx-panca-inclinata', 'Panca inclinata bilanciere', 'Petto'),
  ex('sx-panca-piana-manubri', 'Panca piana manubri', 'Petto'),
  ex('sx-panca-inclinata-manubri', 'Panca inclinata manubri', 'Petto'),
  ex('sx-croci-cavi', 'Croci ai cavi', 'Petto'),
  ex('sx-croci-manubri', 'Croci con manubri', 'Petto'),
  ex('sx-chest-press', 'Chest press', 'Petto'),
  ex('sx-dip', 'Dip alle parallele', 'Petto'),
  ex('sx-pushup', 'Push-up', 'Petto'),
  // Schiena
  ex('sx-stacco', 'Stacco da terra', 'Schiena'),
  ex('sx-trazioni', 'Trazioni alla sbarra', 'Schiena'),
  ex('sx-lat-machine', 'Lat machine', 'Schiena'),
  ex('sx-rematore-bilanciere', 'Rematore bilanciere', 'Schiena'),
  ex('sx-rematore-manubrio', 'Rematore con manubrio', 'Schiena'),
  ex('sx-pulley', 'Pulley basso', 'Schiena'),
  ex('sx-tbar-row', 'T-bar row', 'Schiena'),
  ex('sx-hyperextension', 'Hyperextension', 'Schiena'),
  ex('sx-pullover', 'Pullover ai cavi', 'Schiena'),
  // Spalle
  ex('sx-military-press', 'Military press', 'Spalle'),
  ex('sx-lento-manubri', 'Lento avanti con manubri', 'Spalle'),
  ex('sx-alzate-laterali', 'Alzate laterali', 'Spalle'),
  ex('sx-alzate-posteriori', 'Alzate posteriori', 'Spalle'),
  ex('sx-arnold-press', 'Arnold press', 'Spalle'),
  ex('sx-tirate-mento', 'Tirate al mento', 'Spalle'),
  ex('sx-face-pull', 'Face pull', 'Spalle'),
  ex('sx-shoulder-press', 'Shoulder press machine', 'Spalle'),
  // Bicipiti
  ex('sx-curl-bilanciere', 'Curl con bilanciere', 'Bicipiti'),
  ex('sx-curl-manubri', 'Curl con manubri', 'Bicipiti'),
  ex('sx-curl-martello', 'Curl a martello', 'Bicipiti'),
  ex('sx-curl-scott', 'Curl panca Scott', 'Bicipiti'),
  ex('sx-curl-cavi', 'Curl ai cavi', 'Bicipiti'),
  // Tricipiti
  ex('sx-french-press', 'French press', 'Tricipiti'),
  ex('sx-pushdown', 'Pushdown ai cavi', 'Tricipiti'),
  ex('sx-panca-stretta', 'Panca presa stretta', 'Tricipiti'),
  ex('sx-estensioni-sopra', 'Estensioni sopra la testa', 'Tricipiti'),
  ex('sx-kickback', 'Kickback', 'Tricipiti'),
  // Quadricipiti
  ex('sx-squat', 'Squat con bilanciere', 'Quadricipiti'),
  ex('sx-front-squat', 'Front squat', 'Quadricipiti'),
  ex('sx-leg-press', 'Leg press', 'Quadricipiti'),
  ex('sx-leg-extension', 'Leg extension', 'Quadricipiti'),
  ex('sx-affondi', 'Affondi con manubri', 'Quadricipiti'),
  ex('sx-hack-squat', 'Hack squat', 'Quadricipiti'),
  ex('sx-bulgarian', 'Bulgarian split squat', 'Quadricipiti'),
  // Femorali
  ex('sx-stacco-rumeno', 'Stacco rumeno', 'Femorali'),
  ex('sx-leg-curl-sdraiato', 'Leg curl sdraiato', 'Femorali'),
  ex('sx-leg-curl-seduto', 'Leg curl seduto', 'Femorali'),
  ex('sx-good-morning', 'Good morning', 'Femorali'),
  // Glutei
  ex('sx-hip-thrust', 'Hip thrust', 'Glutei'),
  ex('sx-glute-bridge', 'Glute bridge', 'Glutei'),
  ex('sx-abductor', 'Abductor machine', 'Glutei'),
  // Polpacci
  ex('sx-calf-in-piedi', 'Calf raise in piedi', 'Polpacci'),
  ex('sx-calf-seduto', 'Calf raise seduto', 'Polpacci'),
  // Addome
  ex('sx-crunch', 'Crunch', 'Addome'),
  ex('sx-crunch-cavi', 'Crunch ai cavi', 'Addome'),
  ex('sx-plank', 'Plank', 'Addome'),
  ex('sx-leg-raise', 'Leg raise', 'Addome'),
  // Avambracci
  ex('sx-wrist-curl', 'Wrist curl', 'Avambracci'),
  ex('sx-farmer-walk', "Farmer's walk", 'Avambracci')
];

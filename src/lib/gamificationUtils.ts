import { Archetype } from '../types';

export const ARCHETYPES: Archetype[] = [
  {
    id: 'cyber_dreamer',
    title: 'The Cyber Dreamer',
    subtitle: 'Simulatie Ontdekkingsreiziger',
    description: 'Je leeft in de toekomst en zoekt diepe, immersieve werelden waar je urenlang in kunt verdwalen. Technologische innovatie en ultieme sfeereffecten zijn jouw absolute favoriet!',
    image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=800',
    emoji: '🪐',
    socialFit: 'Solo vr-helm liefhebber of co-op met intieme vrienden',
    traits: [
      { label: 'Immersie', percent: 95 },
      { label: 'Toekomst-focus', percent: 88 },
      { label: 'Geduld', percent: 70 }
    ]
  },
  {
    id: 'speed_runner',
    title: 'The Speed Runner',
    subtitle: 'Adrenaline & Actie Jager',
    description: 'Jij hebt géén geduld voor lange, saaie verhalen! Je wilt actie, snelle resultaten, en onmiddellijke opwinding. TikTok, highlights, en intense tempo-wisselingen omschrijven jou het best.',
    image: 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=800',
    emoji: '⚡',
    socialFit: 'Multiplayer lobby & live esports events',
    traits: [
      { label: 'Tempo', percent: 98 },
      { label: 'Directe Feedback', percent: 92 },
      { label: 'Exploratie', percent: 60 }
    ]
  },
  {
    id: 'chaos_gremlin',
    title: 'The Chaos Gremlin',
    subtitle: '',
    description: 'Je houdt van humor, hilariteit, memes, en onverwachte chaos. Je klikt overal tegelijk op en maakt je eigen regels in dit digitale culturele circuit. Een echte gangmaker!',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=800',
    emoji: '🤪',
    socialFit: 'De absolute gangmaker in groeps-chats & festivals',
    traits: [
      { label: 'Chaos Factor', percent: 99 },
      { label: 'Social Content', percent: 85 },
      { label: 'Humor', percent: 95 }
    ]
  },
  {
    id: 'zen_philosopher',
    title: 'The Zen Philosopher',
    subtitle: 'Diepe Reflecteerder & Dromer',
    description: 'Je hebt oog voor poëzie, esthetiek en de diepere betekenis achter beelden. Je stelt rust, schoonheid en intellectuele prikkels ver boven hectische actie of dopamine-traps.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    emoji: '🧘',
    socialFit: 'Indie cinema club of solo-museum wandelingen',
    traits: [
      { label: 'Bedachtzaamheid', percent: 94 },
      { label: 'Details', percent: 86 },
      { label: 'Esthetiek', percent: 90 }
    ]
  },
  {
    id: 'hype_curator',
    title: 'The Hype Curator',
    subtitle: '',
    description: 'Je balanceert perfect tussen sociaal contact en persoonlijke verdieping. Je deelt de beste verborgen parels direct met je squadron en bent altijd als allereerste op de hoogte van nieuwe hypes.',
    image: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=800',
    emoji: '🔥',
    socialFit: 'Leider van de vriendengroep, filter-ontwerper',
    traits: [
      { label: 'Trend Matching', percent: 88 },
      { label: 'Social Ratio', percent: 90 },
      { label: 'Esthetiek', percent: 80 }
    ]
  }
];

export function calculateArchetype(selectedGenres: string[], answers: Record<string, number>): Archetype {
  const duration = answers['duration'] ?? 50;
  const immersion = answers['immersion'] ?? 50;
  const social = answers['social'] ?? 50;
  const breaks = answers['breaks'] ?? 50;

  if (selectedGenres.includes('comedy') && (social > 60 || duration < 45)) {
    return ARCHETYPES.find(a => a.id === 'chaos_gremlin') || ARCHETYPES[2];
  }
  if (breaks > 65 && social < 45) {
    return ARCHETYPES.find(a => a.id === 'zen_philosopher') || ARCHETYPES[3];
  }
  if (immersion > 65 && duration > 55) {
    return ARCHETYPES.find(a => a.id === 'cyber_dreamer') || ARCHETYPES[0];
  }
  if (duration < 45 && breaks < 45) {
    return ARCHETYPES.find(a => a.id === 'speed_runner') || ARCHETYPES[1];
  }

  return ARCHETYPES.find(a => a.id === 'hype_curator') || ARCHETYPES[4];
}

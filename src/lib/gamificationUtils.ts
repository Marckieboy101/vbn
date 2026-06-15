import { Archetype } from '../types';

export const ARCHETYPES: Archetype[] = [
  {
    id: 'cyber_dreamer',
    title: 'The Cyber Dreamer',
    subtitle: 'Simulatie Ontdekkingsreiziger',
    description: 'Jij loopt graag voorop. Innovatieve technologie, indrukwekkende visuals en meeslepende ervaringen trekken jouw aandacht meteen.',
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
    description: 'Jij wilt niet wachten tot het interessant wordt. Je gaat voor snelle content, veel afwisseling en ervaringen die je direct meeslepen.',
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
    description: 'Jij leeft voor humor, memes en complete chaos. Je probeert alles uit, volgt je eigen pad en zorgt altijd voor energie in de groep.',
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
    description: 'Jij bent iemand die de details ziet. Je geniet van mooie beelden, creatieve ideeën en verhalen met diepgang, terwijl snelle hypes je minder boeien.',
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
    description: 'Jij houdt van gezelligheid, maar vindt het ook fijn om zelf op ontdekking te gaan. Daardoor ben je vaak degene die de nieuwste trends en verborgen parels als eerste vindt.',
    image: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=800',
    emoji: '🔥',
    socialFit: '',
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

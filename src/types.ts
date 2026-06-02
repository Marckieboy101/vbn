export interface Archetype {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  emoji: string;
  socialFit: string;
  traits: {
    label: string;
    percent: number;
  }[];
}

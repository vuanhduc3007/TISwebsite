export type ProjectPillar = "it" | "me" | "renewable";

export type ProjectImage = {
  id: number;
  url: string;
  alt: string;
  caption?: string;
};

export type Project = {
  id: number;
  name: string;
  client: string;
  pillar: ProjectPillar;
  location?: string;
  valueNumber: number;
  value: string;
  date: string;
  isHighlight: boolean;
  images: ProjectImage[];
};

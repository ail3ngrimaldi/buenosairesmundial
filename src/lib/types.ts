export type Zona = "CABA" | "Zona Norte" | "Zona Sur" | "Zona Oeste";
export type BarStatus = "pending" | "approved" | "rejected";

export interface Match {
  id: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  home_code: string;
  away_code: string;
  stage: string;
  group_name: string | null;
}

export interface Bar {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  neighborhood: string;
  zona: Zona;
  latitude: number;
  longitude: number;
  phone: string | null;
  instagram: string | null;
  cover_image_url: string | null;
  features: string[];
  status: BarStatus;
  wants_meeting: boolean;
}

export interface BarWithMatches extends Bar {
  matchIds: string[];
}

export const FEATURE_OPTIONS = [
  { id: "pizzeria", label: "Pizzería" },
  { id: "comidas", label: "Comidas" },
  { id: "merienda", label: "Merienda" },
  { id: "alcohol", label: "Vende alcohol" },
  { id: "cafe", label: "Café" },
  { id: "pantalla-grande", label: "Pantalla grande" },
  { id: "terraza", label: "Terraza" },
] as const;

export const ZONAS: Zona[] = ["CABA", "Zona Norte", "Zona Sur", "Zona Oeste"];

export const NEIGHBORHOODS_BY_ZONA: Record<Zona, string[]> = {
  CABA: [
    "Palermo","Villa Crespo","Belgrano","Núñez","Colegiales","Chacarita",
    "Almagro","Caballito","Recoleta","San Telmo","Boedo","Villa Urquiza",
    "Villa Ortúzar","Saavedra","Flores","Floresta","Parque Patricios",
    "San Cristóbal","Balvanera","Monserrat","Constitución","Barracas",
    "Puerto Madero","Retiro","Coghlan","Devoto","Versalles","Liniers",
  ],
  "Zona Norte": [
    "Vicente López","Olivos","Florida","Martínez","Acassuso","San Isidro",
    "Beccar","Boulogne","Villa Ballester","San Martín","San Fernando","Tigre",
    "Munro","Carapachay","La Lucila",
  ],
  "Zona Sur": [
    "Avellaneda","Lanús","Lomas de Zamora","Quilmes","Banfield","Adrogue",
    "Temperley","Bernal","Wilde","Sarandí",
  ],
  "Zona Oeste": [
    "Ramos Mejía","Morón","Haedo","Ituzaíngo","Castelar","San Justo",
    "Caseros","Hurlingham",
  ],
};

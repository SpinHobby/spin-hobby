export interface IMerchPreview {
  id?: string; // Square catalog object id
  title: string;
  name?: string;
  img: string;
  images?: string[];
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  categories?: { name: string }[];
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isPreorder?: boolean;
  description: string;
  // Anime-specific fields
  series?: string; // e.g., "Love Live!", "Hololive", "Genshin Impact"
  character?: string; // e.g., "Eli Ayase", "Miku Hatsune"
  productType?: string; // e.g., "Figure", "Plushie", "Keychain", "Poster"
  manufacturer?: string; // e.g., "Good Smile Company", "Kotobukiya"
  scale?: string; // e.g., "1/7", "1/8" for figures
  material?: string; // e.g., "PVC", "ABS", "Fabric"
  releaseDate?: string; // Release date in Japan
  preorder?: boolean; // Is this a preorder item?
  exclusive?: boolean; // Convention or store exclusive?
  tags?: string[]; // e.g., ["limited", "new", "popular"]
}

export interface IGroupedMerchPreview {
  name: string;
  merchs: IMerchPreview[];
  subGroups?: IGroupedMerchPreview[];
  // Anime-specific grouping
  series?: string; // Group by anime series
  productType?: string; // Group by product type
}

export interface ICategory {
  name: string;
  img: string;
  // Anime-specific category data
  series?: string; // Series this category belongs to
  productCount?: number; // Number of products in category
  featured?: boolean; // Is this a featured category?
}

// New interfaces for anime-specific features
export interface IAnimeSeries {
  id: string;
  name: string;
  englishName?: string;
  japanName?: string;
  img: string;
  description: string;
  studio?: string; // Animation studio
  year?: number; // Release year
  status?: "ongoing" | "completed" | "upcoming";
  genres?: string[]; // e.g., ["slice-of-life", "idol", "school"]
  popularity?: number; // Popularity ranking
}

export interface ICharacter {
  id: string;
  name: string;
  japanName?: string;
  seriesId: string;
  img: string;
  description?: string;
  voiceActor?: string;
  popularity?: number;
}

export interface IManufacturer {
  id: string;
  name: string;
  country: string;
  logo?: string;
  website?: string;
  specialty?: string[]; // e.g., ["figures", "plushies"]
}

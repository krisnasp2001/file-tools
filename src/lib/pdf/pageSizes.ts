export interface PageSizeDefinition {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const PAGE_SIZES: PageSizeDefinition[] = [
  {
    id: "a4",
    name: "A4",
    widthMm: 210,
    heightMm: 297,
    description: "Standard international paper (210 × 297 mm)",
  },
  {
    id: "letter",
    name: "US Letter",
    widthMm: 215.9,
    heightMm: 279.4,
    description: "Standard US document paper (8.5 × 11 in)",
  },
  {
    id: "a3",
    name: "A3",
    widthMm: 297,
    heightMm: 420,
    description: "Double A4 size for drawings/posters (297 × 420 mm)",
  },
  {
    id: "a5",
    name: "A5",
    widthMm: 148,
    heightMm: 210,
    description: "Compact booklet size (148 × 210 mm)",
  },
  {
    id: "legal",
    name: "US Legal",
    widthMm: 215.9,
    heightMm: 355.6,
    description: "Standard US legal paper (8.5 × 14 in)",
  },
];

export type PageOrientation = "portrait" | "landscape";

export type ImageFittingOption = "fit-to-page" | "original-size";

export interface ImageToPdfConfig {
  pageSizeId: string;
  orientation: PageOrientation;
  fitting: ImageFittingOption;
  marginMm: number; // e.g. 0, 5, 10
}

export const DEFAULT_IMAGE_TO_PDF_CONFIG: ImageToPdfConfig = {
  pageSizeId: "a4",
  orientation: "portrait",
  fitting: "fit-to-page",
  marginMm: 10,
};

export function getPageDimensions(
  pageSizeId: string,
  orientation: PageOrientation
): { widthMm: number; heightMm: number; name: string } {
  const size = PAGE_SIZES.find((s) => s.id === pageSizeId) || PAGE_SIZES[0];
  if (orientation === "landscape") {
    return {
      widthMm: size.heightMm,
      heightMm: size.widthMm,
      name: size.name,
    };
  }
  return {
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    name: size.name,
  };
}

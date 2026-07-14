export const visualAssets = {
  desktop: "/assets/fog-harbor/bg-investigation-room.webp",
  cctvPuzzle: "/assets/fog-harbor/puzzle-cctv-pier7.webp",
  map: "/assets/fog-harbor/map-harbor-investigation.webp",
  tapeRecorder: "/assets/fog-harbor/device-tape-recorder.webp",
  surveillanceRoom: "/assets/fog-harbor/room-surveillance-wall.webp",
  documents: {
    folder: "/assets/fog-harbor/document-case-folder.webp",
    summary: "/assets/fog-harbor/document-case-summary.webp",
    duty: "/assets/fog-harbor/document-duty-roster.webp",
    manifest: "/assets/fog-harbor/document-shipping-manifest.webp",
    weather: "/assets/fog-harbor/document-weather-log.webp",
  },
} as const;

export type DocumentMaterial = keyof typeof visualAssets.documents;

interface DocumentVisual {
  material: DocumentMaterial;
  src: (typeof visualAssets.documents)[DocumentMaterial];
  position: string;
}

const documentMaterialById: Record<string, DocumentVisual> = {
  "doc-case": { material: "summary", src: visualAssets.documents.summary, position: "center 10%" },
  "doc-duty": { material: "duty", src: visualAssets.documents.duty, position: "center 8%" },
  "doc-port": { material: "manifest", src: visualAssets.documents.manifest, position: "center 12%" },
  "doc-weather": { material: "weather", src: visualAssets.documents.weather, position: "center 8%" },
  "doc-phone": { material: "summary", src: visualAssets.documents.summary, position: "center 38%" },
  "doc-clerk": { material: "summary", src: visualAssets.documents.summary, position: "center 62%" },
  "doc-manifest": { material: "manifest", src: visualAssets.documents.manifest, position: "center 42%" },
  "doc-closure": { material: "folder", src: visualAssets.documents.folder, position: "center 14%" },
  "doc-final": { material: "folder", src: visualAssets.documents.folder, position: "center 46%" },
};

const fallbackDocumentVisual: DocumentVisual = {
  material: "summary",
  src: visualAssets.documents.summary,
  position: "center 18%",
};

export function getDocumentVisual(documentId: string): DocumentVisual {
  return documentMaterialById[documentId] ?? fallbackDocumentVisual;
}

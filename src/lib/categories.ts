export type ProductCategory = { slug: string; label: string };

// Categorias de roupa (curadas) — dirigem o menu do catálogo público.
// Um produto pode ter 1+ categorias. Guardamos o slug; o label é só pra exibir.
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { slug: "jeans", label: "Jeans" },
  { slug: "moda", label: "Moda" },
  { slug: "feminino", label: "Feminino" },
  { slug: "masculino", label: "Masculino" },
  { slug: "infantil", label: "Infantil" },
  { slug: "juvenil", label: "Juvenil" },
  { slug: "plus-size", label: "Plus Size" },
  { slug: "praia", label: "Praia / Verão" },
  { slug: "fitness", label: "Fitness" },
  { slug: "inverno", label: "Inverno" },
  { slug: "social", label: "Social" },
  { slug: "acessorios", label: "Acessórios" },
];

export const CATEGORY_SLUGS: string[] = PRODUCT_CATEGORIES.map((c) => c.slug);

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((c) => [c.slug, c.label]),
);

import { getCategories, searchProducts } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const nice = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${nice} — MarkComm`,
    description: `Shop the best ${nice} products from verified Sri Lankan vendors.`,
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  'mens-fashion': '👔', 'womens-fashion': '👗', 'electronics': '📱',
  'home-garden': '🏡', 'sports-outdoors': '⚽', 'beauty-personal-care': '💄',
  'books-stationery': '📚', 'food-groceries': '🥥',
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const categoriesRes = await getCategories().catch(() => ({ data: [] }));
  const cat = categoriesRes.data.find((c) => c.slug === slug);
  if (!cat) notFound();

  const productsRes = await searchProducts({ categoryId: cat.id, limit: 24, inStock: undefined }).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 24 } }));
  const products = productsRes.data;

  return (
    <div className="container-xl py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
        <Link href="/" className="hover:text-zinc-900">Home</Link>
        <span>/</span>
        <Link href="/search" className="hover:text-zinc-900">All Products</Link>
        <span>/</span>
        <span className="text-zinc-900 font-medium">{cat.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl">
          {CATEGORY_ICONS[slug] ?? '🛍️'}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">{cat.name}</h1>
          {cat.description && <p className="text-zinc-500 mt-1">{cat.description}</p>}
        </div>
      </div>

      {/* Other categories */}
      <div className="flex gap-2 flex-wrap mb-8">
        {categoriesRes.data.filter((c) => c.slug !== slug).slice(0, 7).map((c) => (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 text-sm text-zinc-600 hover:border-violet-300 hover:text-violet-700 transition-all"
          >
            {CATEGORY_ICONS[c.slug] ?? '🛍️'} {c.name}
          </Link>
        ))}
      </div>

      {/* Products */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">{CATEGORY_ICONS[slug] ?? '🛍️'}</div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">No products yet</h2>
          <p className="text-zinc-500 mb-6">Be the first to list in {cat.name}!</p>
          <Link href="/search" className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all">
            Browse All Products
          </Link>
        </div>
      )}
    </div>
  );
}

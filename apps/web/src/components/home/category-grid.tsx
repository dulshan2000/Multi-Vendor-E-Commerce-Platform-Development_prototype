import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: '1', name: "Women's Fashion", slug: 'womens-fashion' },
  { id: '2', name: "Men's Fashion", slug: 'mens-fashion' },
  { id: '3', name: 'Electronics', slug: 'electronics' },
  { id: '4', name: 'Home & Garden', slug: 'home-garden' },
  { id: '5', name: 'Sports', slug: 'sports-outdoors' },
  { id: '6', name: 'Beauty', slug: 'beauty-personal-care' },
  { id: '7', name: 'Books', slug: 'books-stationery' },
  { id: '8', name: 'Food', slug: 'food-groceries' },
];

const CATEGORY_LABELS: Record<string, string> = {
  'mens-fashion': "Men's",
  'womens-fashion': "Women's",
  electronics: 'Electronics',
  'home-garden': 'Home',
  'sports-outdoors': 'Sports',
  'beauty-personal-care': 'Beauty',
  'books-stationery': 'Books',
  'food-groceries': 'Food',
};

/* Roman numeral for editorial feel */
function toRoman(n: number): string {
  const nums = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  return nums[n] ?? String(n + 1);
}

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const list = (categories.length > 0 ? categories : FALLBACK_CATEGORIES).slice(0, 8);

  return (
    <div
      className="grid grid-cols-4 sm:grid-cols-8 gap-0"
      role="list"
      aria-label="Product categories"
    >
      {list.map((cat, i) => (
        <Link
          key={cat.id}
          href={`/categories/${cat.slug}`}
          role="listitem"
          className="group relative flex flex-col items-center justify-center py-8 px-2 text-center border-r border-b transition-colors duration-200 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ borderColor: 'var(--color-border)' }}
          aria-label={cat.name}
        >
          {/* Roman numeral index */}
          <span
            className="ui-label mb-3 transition-colors duration-200 group-hover:text-accent"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {toRoman(i)}
          </span>

          {/* Category name */}
          <span
            className="font-display text-sm font-light tracking-wide transition-colors duration-200 group-hover:text-accent"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {CATEGORY_LABELS[cat.slug] ?? cat.name}
          </span>

          {/* Accent underline on hover */}
          <span
            className="absolute bottom-0 inset-x-0 h-px scale-x-0 origin-center transition-transform duration-300 group-hover:scale-x-100"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}

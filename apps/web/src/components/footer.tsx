import Link from 'next/link';

const footerLinks = {
  Shop: [
    { label: "Women's Fashion", href: '/categories/womens-fashion' },
    { label: "Men's Fashion", href: '/categories/mens-fashion' },
    { label: 'Electronics', href: '/categories/electronics' },
    { label: 'Home & Garden', href: '/categories/home-garden' },
    { label: 'Flash Sales 🔥', href: '/flash-sales' },
  ],
  Sellers: [
    { label: 'Sell on MarkComm', href: '/vendor/register' },
    { label: 'Vendor Dashboard', href: '/vendor/dashboard' },
    { label: 'Commission Rates', href: '/vendor/pricing' },
    { label: 'Seller Guidelines', href: '/vendor/guidelines' },
  ],
  Help: [
    { label: 'Track Order', href: '/orders' },
    { label: 'Returns & Refunds', href: '/help/returns' },
    { label: 'Shipping Info', href: '/help/shipping' },
    { label: 'Contact Us', href: '/help/contact' },
  ],
  Company: [
    { label: 'About MarkComm', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Careers', href: '/careers' },
  ],
};

const paymentMethods = [
  { name: 'PayHere', color: '#FF6B35', icon: '💳' },
  { name: 'Dialog Genie', color: '#00A3E0', icon: '📱' },
  { name: 'FriMi', color: '#7B2D8B', icon: '💜' },
  { name: 'Visa / MC', color: '#1A1F71', icon: '💳' },
  { name: 'Cash on Delivery', color: '#10B981', icon: '💵' },
];

const deliveryPartners = ['Domex', 'PickMe Delivery', 'Lanka Post EMS', 'DHL Express'];

export function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-300 mt-16">
      {/* Top section */}
      <div className="container-xl py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {Object.entries(footerLinks).map(([section, links]) => (
          <div key={section}>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">{section}</h4>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Payment & delivery */}
      <div className="border-t border-zinc-800">
        <div className="container-xl py-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Secure Payments</p>
            <div className="flex flex-wrap gap-3">
              {paymentMethods.map((pm) => (
                <span
                  key={pm.name}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700"
                  style={{ color: pm.color }}
                >
                  {pm.icon} {pm.name}
                </span>
              ))}
            </div>
          </div>
          <div className="md:ml-auto">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Delivery Partners</p>
            <div className="flex flex-wrap gap-2">
              {deliveryPartners.map((d) => (
                <span key={d} className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                  🚚 {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800">
        <div className="container-xl py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center text-white font-bold text-[10px]">M</div>
            <span>© {new Date().getFullYear()} Mark & Comm (Pvt) Ltd. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-1">
            🇱🇰 Made with pride in Sri Lanka
          </div>
        </div>
      </div>
    </footer>
  );
}

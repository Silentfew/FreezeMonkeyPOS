"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/kitchen', label: 'Kitchen Times' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/reports/tax-weekly', label: 'Weekly Income Summary' },
  { href: '/admin/reports/orders', label: 'Orders / Refunds' },
  { href: '/admin/reports/daily-closeout', label: 'Daily Closeout' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 rounded-full bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 ring-1 ring-white/10">
      {links.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3 py-1 transition hover:bg-white/20 ${
              active ? 'bg-[#00C2FF]/20 text-[#E9F9FF]' : 'bg-white/10'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

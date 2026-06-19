"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (!user) return null;

  const links = [
    ...(user.role === 'TUTOR' ? [{ name: 'Profile', href: '/settings/profile' }] : []),
    { name: 'Notifications', href: '/settings/notifications' },
  ];

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 shrink-0">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <nav className="flex flex-col space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { navigation } from "@/content/site";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-shell flex h-[72px] items-center justify-between gap-4">
        <Link className="brand" href="/" aria-label="TIS - Trang chủ">
          <Image src="/brand/tis-logo-horizontal.png" alt="TIS" width={140} height={65} className="w-auto h-12 lg:h-16 object-contain" priority />
        </Link>

        <nav className="hidden items-center gap-10 lg:flex" aria-label="Điều hướng chính">
          {navigation.map((item) => (
            <Link className="nav-link font-medium hover:text-[var(--accent)] transition-colors" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="tel:0988761315" className="nav-link text-[var(--accent)] font-bold">0988 761 315</a>
          <ThemeToggle />
          <Link className="button-primary button-small" href="/contact">
            Liên hệ
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <details className="mobile-menu">
            <summary>Danh mục</summary>
            <nav aria-label="Điều hướng di động">
              {navigation.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
              <a href="tel:0988761315">0988 761 315</a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

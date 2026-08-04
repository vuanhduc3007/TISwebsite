import Image from "next/image";
import Link from "next/link";
import { navigation } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] py-10">
      <div className="site-shell grid gap-8 md:grid-cols-[1.35fr_.65fr] md:items-start">
        <div>
          <Link className="brand" href="/" aria-label="TIS - Trang chủ">
            <Image src="/brand/tis-logo-horizontal.png" alt="TIS" width={100} height={36} />
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--ink-muted)]">
            Công Ty Cổ Phần Thương Mại Và Dịch Vụ Tin Học Viễn Thông TIS
          </p>
          <div className="mt-3 grid gap-1 text-sm text-[var(--ink-muted)]">
            <p>Số 22, ngõ 318/80, phố Ngọc Trì, phường Long Biên, Hà Nội</p>
            <p>
              <a href="tel:0988761315" className="hover:text-[var(--accent)] transition-colors">0988 761 315</a>
              {" "}
              <span className="mx-1 text-[var(--line)]">|</span>
              {" "}
              <a href="mailto:phanpccc1978@gmail.com" className="hover:text-[var(--accent)] transition-colors">phanpccc1978@gmail.com</a>
            </p>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3" aria-label="Điều hướng chân trang">
          {navigation.map((item) => (
            <Link className="footer-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="site-shell mt-8 text-xs text-[var(--ink-muted)]">© {new Date().getFullYear()} TIS. MST 0106229287. Chất lượng - Uy tín - Hiệu quả.</div>
    </footer>
  );
}

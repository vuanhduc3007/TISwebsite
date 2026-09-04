import Image from "next/image";
import Link from "next/link";
import { navigation } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-[var(--line)] flex flex-col justify-center py-12">
      <div className="site-shell grid gap-8 md:grid-cols-[1.35fr_.65fr] md:items-start">
        <div>
          <Link className="brand" href="/" aria-label="TIS - Trang chủ">
            <Image src="/brand/tis-logo-horizontal.png" alt="TIS" width={140} height={65} className="w-auto h-16 object-contain" />
          </Link>
          <p className="mt-4 max-w-md text-base leading-6 text-[var(--ink-muted)]">
            Công Ty Cổ Phần Thương Mại Và Dịch Vụ Tin Học Viễn Thông TIS
          </p>
          <div className="mt-3 grid gap-1 text-base text-[var(--ink-muted)]">
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
        <div className="w-full h-[200px] md:h-[260px] rounded-xl overflow-hidden ring-1 ring-[var(--line)] shadow-sm hover:shadow-md transition-shadow">
          <iframe 
            src="https://maps.google.com/maps?q=S%E1%BB%91%2022,%20ng%C3%B5%20318/80,%20ph%E1%BB%91%20Ng%E1%BB%8Dc%20Tr%C3%AC,%20ph%C6%B0%E1%BB%9Dng%20Long%20Bi%C3%AAn,%20H%C3%A0%20N%E1%BB%99i&t=&z=15&ie=UTF8&iwloc=&output=embed" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Bản đồ vị trí Công ty TIS"
          ></iframe>
        </div>
      </div>
      <div className="site-shell mt-8 text-sm text-[var(--ink-muted)]">© {new Date().getFullYear()} Công ty TIS. MST 0106229287. Chất lượng - Uy tín - Hiệu quả.</div>
    </footer>
  );
}

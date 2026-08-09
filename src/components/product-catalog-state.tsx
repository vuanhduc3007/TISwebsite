import { IconAlertTriangle, IconPackage } from "@tabler/icons-react";

type ProductCatalogStateProps = {
  variant: "empty" | "error";
  message: string;
};

export function ProductCatalogState({ variant, message }: ProductCatalogStateProps) {
  const Icon = variant === "error" ? IconAlertTriangle : IconPackage;

  return (
    <section className="site-shell section-space pt-0">
      <div className="content-panel flex flex-col items-start gap-4">
        <Icon size={26} width={26} height={26} stroke={1.6} color="var(--accent)" aria-hidden="true" />
        <div>
          <p className="eyebrow">{variant === "error" ? "DATABASE STATUS" : "CATALOG STATUS"}</p>
          <h2>{variant === "error" ? "Chưa thể hiển thị sản phẩm" : "Chưa có sản phẩm"}</h2>
          <p>{message}</p>
        </div>
      </div>
    </section>
  );
}

"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="admin-panel" role="alert">
      <p className="admin-eyebrow">Có lỗi xảy ra</p>
      <h1>Không thể hoàn tất yêu cầu</h1>
      <p>Vui lòng thử lại. Nếu lỗi tiếp tục xảy ra, hãy kiểm tra log phía máy chủ.</p>
      <button className="admin-button admin-button-primary" type="button" onClick={reset}>Thử lại</button>
    </section>
  );
}

"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "error" | "ready";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const need = String(form.get("need") ?? "").trim();
    setState(name && phone && need ? "ready" : "error");
  }

  return (
    <form className="contact-form" noValidate onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="name">Họ và tên</label>
        <input id="name" name="name" autoComplete="name" />
      </div>
      <div className="form-row">
        <label htmlFor="phone">Số điện thoại</label>
        <input id="phone" name="phone" inputMode="tel" autoComplete="tel" />
      </div>
      <div className="form-row">
        <label htmlFor="need">Nhu cầu của bạn</label>
        <textarea id="need" name="need" rows={5} aria-describedby="need-help" />
        <p id="need-help" className="form-help">Ví dụ: loại mái, quy mô công trình hoặc thiết bị cần tìm hiểu.</p>
      </div>
      {state === "error" && <p className="form-message form-error" role="alert">Vui lòng hoàn tất họ tên, số điện thoại và nhu cầu trước khi gửi.</p>}
      {state === "ready" && <p className="form-message form-ready" role="status" aria-live="polite">Thông tin đã sẵn sàng để gửi. Kết nối biểu mẫu này với CRM hoặc hộp thư trước khi xuất bản.</p>}
      <button className="button-primary" type="submit">Gửi yêu cầu</button>
    </form>
  );
}

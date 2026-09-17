"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error" | "validation";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const need = String(form.get("need") ?? "").trim();

    // Client-side validation
    if (!name || !phone || !need) {
      setState("validation");
      return;
    }

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, need }),
      });

      if (res.ok) {
        setState("success");
        // Reset form
        formEl.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "Không thể gửi yêu cầu. Vui lòng thử lại sau.");
        setState("error");
      }
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
      setState("error");
    }
  }

  return (
    <form className="contact-form" noValidate onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="name">Họ và tên</label>
        <input id="name" name="name" autoComplete="name" disabled={state === "submitting"} />
      </div>
      <div className="form-row">
        <label htmlFor="phone">Số điện thoại</label>
        <input id="phone" name="phone" inputMode="tel" autoComplete="tel" disabled={state === "submitting"} />
      </div>
      <div className="form-row">
        <label htmlFor="need">Nhu cầu của bạn</label>
        <textarea id="need" name="need" rows={5} aria-describedby="need-help" disabled={state === "submitting"} />
        <p id="need-help" className="form-help">Ví dụ: loại mái, quy mô công trình hoặc thiết bị cần tìm hiểu.</p>
      </div>
      {state === "validation" && <p className="form-message form-error" role="alert">Vui lòng hoàn tất họ tên, số điện thoại và nhu cầu trước khi gửi.</p>}
      {state === "error" && <p className="form-message form-error" role="alert">{errorMsg}</p>}
      {state === "success" && <p className="form-message form-ready" role="status" aria-live="polite">✅ Yêu cầu của bạn đã được gửi thành công! Chúng tôi sẽ liên hệ lại sớm nhất.</p>}
      <button className="button-primary" type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Đang gửi..." : "Gửi yêu cầu"}
      </button>
    </form>
  );
}

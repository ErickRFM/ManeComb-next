"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function MfaForm() {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [state, setState] = useState("Preparando verificación...");
  const [busy, setBusy] = useState(false);
  const [error,setError]=useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/mfa/setup", { method: "POST" })
      .then(async (response) => {
        if (response.status === 403 || response.status === 401 || response.status === 409) {
          if (mounted) setState("Ingresa el código de tu autenticador.");
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo preparar MFA");
        if (mounted) {
          setSetup({ secret: data.secret, uri: data.uri });
          setState("Agrega esta cuenta a tu aplicación de autenticación y confirma el código.");
        }
      })
      .catch((error) => mounted && setState(error.message));
    return () => { mounted = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    setState("Verificando...");
    const code = String(new FormData(event.currentTarget).get("code") || "").replace(/\s+/g, "");
    try{const response = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok){setError(true);return setState(data.error || "Código inválido")}
    setState("Verificación correcta");
    router.push("/admin/salud");
    router.refresh();
    }catch{setError(true);setState("No se pudo verificar el código. Revisa la conexión y vuelve a intentar.")}
    finally{setBusy(false)}
  }

  return <div className="grid" style={{ maxWidth: 560 }}>
    {setup ? <div className="card grid">
      <strong>Configura tu autenticador</strong>
      <p className="muted">Guarda esta clave en Google Authenticator, 1Password, Authy u otra app TOTP.</p>
      <code style={{ overflowWrap: "anywhere", fontSize: 18 }}>{setup.secret}</code>
      <details>
        <summary>URI TOTP</summary>
        <code style={{ overflowWrap: "anywhere" }}>{setup.uri}</code>
      </details>
    </div> : null}
    <form className="card grid" aria-busy={busy} onSubmit={submit}>
      <label className="grid">Código de verificación<input className="input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required /></label>
      <button className="btn" disabled={busy}>{busy ? "Verificando..." : "Verificar"}</button>
      <p className={error?"danger-text":"muted"} role={error?"alert":"status"} style={{ margin: 0 }}>{state}</p>
    </form>
  </div>;
}

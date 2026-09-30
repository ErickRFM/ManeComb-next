"use client";
import { useState } from "react";
import { UiModal } from "@/src/components/ui-modal";

export function VisualQaModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState("");
  return <section className="card">
    <button className="btn" data-critical-action onClick={() => setOpen(true)}>Abrir modal</button>
    <p role="status">{feedback}</p>
    <UiModal open={open} title="Formulario de QA" description="Verificación de teclado, validación y foco" onClose={() => setOpen(false)}>
      <form className="grid" onSubmit={event => { event.preventDefault(); setFeedback("Guardado: " + name); setOpen(false); }}>
        <label htmlFor="visual-modal-name">Nombre de unidad</label>
        <input id="visual-modal-name" required value={name} onChange={event => setName(event.target.value)} />
        <button className="btn" data-critical-action>Guardar</button>
      </form>
    </UiModal>
  </section>;
}

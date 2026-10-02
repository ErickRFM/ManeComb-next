"use client";
import { InputHTMLAttributes, useId, useState } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function PasswordField({label,className="input",...props}:Props){
  const id=useId();
  const [visible,setVisible]=useState(false);
  return <label className="password-field-label" htmlFor={id}>
    <span>{label}</span>
    <span className="password-field-control">
      <input {...props} id={id} className={className} type={visible?"text":"password"}/>
      <button
        type="button"
        className="password-visibility-toggle"
        aria-label={visible?"Ocultar contraseña":"Mostrar contraseña"}
        aria-pressed={visible}
        onClick={()=>setVisible(value=>!value)}
      >
        {visible?
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.9 4.2A10.5 10.5 0 0112 4c5.5 0 9 5.2 9 5.2a15.7 15.7 0 01-2.3 2.8M6.2 6.2C4.2 7.5 3 9.2 3 9.2S6.5 16 12 16c1 0 2-.2 2.8-.5"/></svg>:
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"/><circle cx="12" cy="12" r="2.5"/></svg>
        }
      </button>
    </span>
  </label>;
}

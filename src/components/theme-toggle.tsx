"use client";

import { useEffect, useState } from "react";

type Theme="dark"|"light";

export function ThemeToggle(){
  const [theme,setTheme]=useState<Theme>("dark");

  useEffect(()=>{
    const current=(document.documentElement.dataset.theme==="light"?"light":"dark") as Theme;
    setTheme(current);
  },[]);

  function toggle(){
    const next:Theme=theme==="dark"?"light":"dark";
    document.documentElement.dataset.theme=next;
    localStorage.setItem("manecomb.theme",next);
    setTheme(next);
  }

  return <button className="icon-action" onClick={toggle} aria-label={theme==="dark"?"Usar tema claro":"Usar tema oscuro"} title={theme==="dark"?"Tema claro":"Tema oscuro"}>
    <span aria-hidden="true">{theme==="dark"?"☀":"☾"}</span>
  </button>;
}

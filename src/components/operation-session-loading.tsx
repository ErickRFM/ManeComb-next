import { BrandLogo } from "@/src/components/brand-logo";

export function OperationSessionLoading({error,onRetry}:{error?:string;onRetry?:()=>void}){
  return <main id="main-content" className="operation-session-check" aria-busy={!error}>
    <div className="operation-session-check-inner">
      <BrandLogo size="lg" tone="dark"/>
      <img src="/manecomb-mobile-faster.png" alt="" aria-hidden="true"/>
      {error?<>
        <h1>No pudimos comprobar tu sesión</h1>
        <p role="alert">{error}</p>
        <button className="btn" onClick={onRetry}>Reintentar</button>
      </>:<>
        <span className="operation-session-spinner" aria-hidden="true"/>
        <h1>Preparando ManeComb</h1>
        <p role="status">Comprobando tu sesión operativa…</p>
      </>}
    </div>
  </main>;
}

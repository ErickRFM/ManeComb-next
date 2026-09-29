import { Navigation } from "@/src/components/navigation";
export function ModuleShell(props:{eyebrow?:string;title:string;description:string;children?:React.ReactNode}) {
  return <div className="shell"><Navigation /><main className="page">
    {props.eyebrow ? <span className="badge">{props.eyebrow}</span> : null}
    <h1 className="module-title" style={{marginTop:14}}>{props.title}</h1>
    <p className="module-copy">{props.description}</p>
    <div style={{marginTop:28}}>{props.children}</div>
  </main></div>;
}

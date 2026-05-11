import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { section: 'PRINCIPAL', items: [
    { label: 'Dashboard', path: '/' },
    { label: 'CDR — Llamadas', path: '/cdr' },
    { label: 'Extensiones', path: '/extensions' },
    { label: 'Metricas', path: '/metrics' },
  ]},
  { section: 'COMERCIAL', items: [
    { label: 'Carriers / Trunks', path: '/carriers' },
    { label: 'Clientes', path: '/clientes' },
    { label: 'Planes de cobro', path: '/planes' },
    { label: 'Series DID', path: '/did-series' },
  ]},
  { section: 'CONFIGURACION', items: [
    { label: 'Ajustes', path: '/settings' },
  ]},
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <aside style={{width:220,minHeight:'100vh',background:'#fff',borderRight:'1px solid #e2e8f0',flexShrink:0}}>
      <div style={{padding:'20px 18px 16px',borderBottom:'1px solid #e2e8f0'}}>
        <span style={{display:'block',fontWeight:700,fontSize:15,color:'#0f172a',marginBottom:3}}>Netvoice Panel</span>
        <span style={{display:'block',fontSize:11,color:'#94a3b8'}}>Linkotel · voip-panel-01</span>
      </div>
      <nav style={{padding:'12px 10px'}}>
        {menuItems.map(({section,items})=>(
          <div key={section} style={{marginBottom:20}}>
            <span style={{display:'block',fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:'0.8px',padding:'0 8px',marginBottom:4}}>{section}</span>
            {items.map(({label,path})=>{
              const active = location.pathname===path;
              return (
                <button key={path} onClick={()=>navigate(path)}
                  style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 10px',borderRadius:7,border:'none',background:active?'#eff6ff':'transparent',color:active?'#1d4ed8':'#475569',fontSize:13,fontWeight:active?600:500,cursor:'pointer',textAlign:'left',marginBottom:2,fontFamily:'inherit'}}>
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

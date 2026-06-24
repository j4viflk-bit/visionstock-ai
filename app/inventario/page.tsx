'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function InventarioPage() {
  const router = useRouter()
  const [productos, setProductos] = useState<any[]>([])
  const [cameras, setCameras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  const [form, setForm] = useState({
    nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: '', fecha_vencimiento: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email || '')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'dueno') { router.push('/dashboard'); return }
      setUserRole(profile?.role || 'dueno')
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async () => {
    const { data: productosData } = await supabase.from('productos').select('*, cameras(name, location)').order('created_at', { ascending: false })
    const { data: camerasData } = await supabase.from('cameras').select('*').eq('is_active', true)
    setProductos(productosData || [])
    setCameras(camerasData || [])
  }

  const handleSubmit = async () => {
    if (!form.nombre || !form.categoria) { alert('Nombre y categoría son obligatorios'); return }
    if (editando) {
      await supabase.from('productos').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editando.id)
    } else {
      await supabase.from('productos').insert(form)
    }
    setForm({ nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: '', fecha_vencimiento: '' })
    setShowForm(false); setEditando(null)
    await loadData()
  }

  const handleEdit = (producto: any) => {
    setEditando(producto)
    setForm({ nombre: producto.nombre, categoria: producto.categoria, stock_actual: producto.stock_actual, stock_minimo: producto.stock_minimo, unidad: producto.unidad, camera_id: producto.camera_id || '', fecha_vencimiento: producto.fecha_vencimiento || '' })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    await loadData()
  }

  const handleStockUpdate = async (id: string, nuevoStock: number) => {
    await supabase.from('productos').update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() }).eq('id', id)
    await loadData()
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
    border: '1px solid #E4E4E7', background: '#FAFAFA', color: '#09090B',
    outline: 'none', boxSizing: 'border-box' as const
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F4F4F5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E4E4E7', borderTop: '3px solid #0EA5E9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#A1A1AA' }}>Cargando inventario...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  const stockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo).length
  const stockOk = productos.filter(p => p.stock_actual > p.stock_minimo).length
  const hoyStr = new Date().toISOString().split('T')[0]
  const productosVencidos = productos.filter(p => p.fecha_vencimiento && p.fecha_vencimiento < hoyStr)
  const vencidos = productosVencidos.length
  const unidadesVencidas = productosVencidos.reduce((sum, p) => sum + (p.stock_actual || 0), 0)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif", background: '#F4F4F5' }}>

      <Sidebar
        userEmail={userEmail}
        userRole={userRole}
        activePage="/inventario"
        onLogout={handleLogout}
      />

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar desktop */}
        <div style={{ display: 'flex', gap: 8 }}>
  <button
    onClick={async () => {
      const res = await fetch('/api/vencimiento')
      const data = await res.json()
      alert(data.mensaje)
    }}
    style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #E4E4E7', cursor: 'pointer', background: '#fff', color: '#71717A' }}
  >
    Verificar vencimientos
  </button>
  <button
    onClick={() => { setShowForm(!showForm); setEditando(null); setForm({ nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: '', fecha_vencimiento: '' }) }}
    style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: showForm ? '#F4F4F5' : '#0EA5E9', color: showForm ? '#71717A' : '#fff' }}
  >
    {showForm ? 'Cancelar' : '+ Agregar'}
  </button>
</div>

        {/* Espacio topbar mobile */}
        <div className="topbar-mobile-space" style={{ display: 'none', height: 56 }} />

        <div style={{ padding: 28 }} className="main-padding">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Botón agregar mobile */}
            <div className="btn-mobile" style={{ display: 'none' }}>
              <button
                onClick={async () => {
                  const res = await fetch('/api/vencimiento')
                  const data = await res.json()
                  alert(data.mensaje)
                }}
                style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #E4E4E7', cursor: 'pointer', background: '#fff', color: '#71717A', marginBottom: 8 }}
              >
                Verificar vencimientos
              </button>
              <button
                onClick={() => { setShowForm(!showForm); setEditando(null); setForm({ nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: '', fecha_vencimiento: '' }) }}
                style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: showForm ? '#F4F4F5' : '#0EA5E9', color: showForm ? '#71717A' : '#fff' }}
              >
                {showForm ? 'Cancelar' : '+ Agregar producto'}
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gap: 16 }} className="stats-grid">
              {[
                { label: 'Total productos', value: productos.length, color: '#09090B', bg: '#fff', sub: null },
                { label: 'Stock bajo', value: stockBajo, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', sub: null },
                { label: 'Stock OK', value: stockOk, color: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0', sub: null },
                { label: 'Vencidos', value: vencidos, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', sub: `${unidadesVencidas} unidades` },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: '18px 20px', border: `1px solid ${(s as any).border || '#E4E4E7'}` }}>
                  <div style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Formulario */}
            {showForm && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#09090B', marginBottom: 20 }}>
                  {editando ? 'Editar producto' : 'Nuevo producto'}
                </h2>
                <div style={{ display: 'grid', gap: 16, marginBottom: 20 }} className="form-grid">
                  {[
                    { label: 'Nombre del producto', key: 'nombre', placeholder: 'Ej: Coca Cola 1.5L', type: 'text' },
                    { label: 'Categoría', key: 'categoria', placeholder: 'Ej: bebidas, snacks', type: 'text' },
                    { label: 'Stock actual', key: 'stock_actual', placeholder: '0', type: 'number' },
                    { label: 'Stock mínimo', key: 'stock_minimo', placeholder: '5', type: 'number' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#52525B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{field.label}</label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={(form as any)[field.key]}
                        onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  ))}

                  {/* Fecha de vencimiento */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: '#52525B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha de vencimiento</label>
                    <input
                      type="date"
                      value={form.fecha_vencimiento}
                      onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: '#52525B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unidad</label>
                    <select value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} style={inputStyle}>
                      <option value="unidades">Unidades</option>
                      <option value="cajas">Cajas</option>
                      <option value="kg">Kilogramos</option>
                      <option value="litros">Litros</option>
                      <option value="paquetes">Paquetes</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: '#52525B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cámara asociada</label>
                    <select value={form.camera_id} onChange={e => setForm({ ...form, camera_id: e.target.value })} style={inputStyle}>
                      <option value="">Sin cámara asignada</option>
                      {cameras.map(cam => <option key={cam.id} value={cam.id}>{cam.name} — {cam.location}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleSubmit} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#0EA5E9', color: '#fff' }}>
                  {editando ? 'Guardar cambios' : 'Agregar producto'}
                </button>
              </div>
            )}

            {/* Lista productos */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'auto' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B' }}>Productos registrados</span>
                <span style={{ fontSize: 11, color: '#A1A1AA' }}>{productos.length} productos</span>
              </div>

              {productos.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#A1A1AA' }}>No hay productos registrados. Agrega el primero.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      {['Producto', 'Categoría', 'Cámara', 'Stock', 'Vence', 'Estado', 'Acciones'].map(h => (
                        <th key={h} style={{ fontSize: 10, color: '#A1A1AA', padding: '10px 16px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid #F4F4F5', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < productos.length - 1 ? '1px solid #F4F4F5' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#09090B', whiteSpace: 'nowrap' }}>{p.nombre}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#71717A', whiteSpace: 'nowrap' }}>{p.categoria}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#71717A', whiteSpace: 'nowrap' }}>{p.cameras?.name || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => handleStockUpdate(p.id, Math.max(0, p.stock_actual - 1))} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <div style={{ textAlign: 'center', minWidth: 60 }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: p.stock_actual <= p.stock_minimo ? '#EF4444' : '#22C55E', lineHeight: 1 }}>{p.stock_actual}</div>
                              <div style={{ fontSize: 9, color: '#A1A1AA', marginTop: 2 }}>{p.unidad}</div>
                            </div>
                            <button onClick={() => handleStockUpdate(p.id, p.stock_actual + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#22C55E', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                          <div style={{ fontSize: 10, color: '#A1A1AA', marginTop: 4 }}>Mín: {p.stock_minimo} {p.unidad}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.fecha_vencimiento ? (() => {
                            const yaVencio = p.fecha_vencimiento < hoyStr
                            const porVencer = !yaVencio && new Date(p.fecha_vencimiento) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            return (
                              <span style={{
                                fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap',
                                background: yaVencio ? '#FEE2E2' : porVencer ? '#FEF2F2' : '#F4F4F5',
                                color: yaVencio ? '#DC2626' : porVencer ? '#EF4444' : '#71717A'
                              }}>
                                {yaVencio ? '⚠ ' : ''}{new Date(p.fecha_vencimiento).toLocaleDateString('es-CL')}
                              </span>
                            )
                          })() : <span style={{ fontSize: 11, color: '#A1A1AA' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: p.stock_actual <= p.stock_minimo ? '#FEE2E2' : '#DCFCE7', color: p.stock_actual <= p.stock_minimo ? '#EF4444' : '#16A34A', whiteSpace: 'nowrap' }}>
                            {p.stock_actual <= p.stock_minimo ? 'Stock bajo' : 'OK'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleEdit(p)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: '1px solid #E4E4E7', background: '#fff', color: '#71717A', cursor: 'pointer', whiteSpace: 'nowrap' }}>Editar</button>
                            <button onClick={() => handleDelete(p.id)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: '1px solid #FECACA', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', whiteSpace: 'nowrap' }}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .topbar-mobile-space { display: none; }
        .btn-mobile { display: none; }
        .stats-grid { grid-template-columns: repeat(4, 1fr); }
        .form-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 768px) {
          .topbar-desktop { display: none !important; }
          .topbar-mobile-space { display: block !important; }
          .btn-mobile { display: block !important; }
          .main-padding { padding: 16px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
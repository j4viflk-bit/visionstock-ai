'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function InventarioPage() {
  const router = useRouter()
  const [productos, setProductos] = useState<any[]>([])
  const [cameras, setCameras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({
    nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'dueno') { router.push('/dashboard'); return }
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
    setForm({ nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: '' })
    setShowForm(false); setEditando(null)
    await loadData()
  }

  const handleEdit = (producto: any) => {
    setEditando(producto)
    setForm({ nombre: producto.nombre, categoria: producto.categoria, stock_actual: producto.stock_actual, stock_minimo: producto.stock_minimo, unidad: producto.unidad, camera_id: producto.camera_id || '' })
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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif", background: '#F4F4F5' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 240, background: '#1C1C1E', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#0EA5E9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: 18, height: 18, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>VisionStock AI</div>
            <div style={{ color: '#52525B', fontSize: 10 }}>AI Monitoring</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '4px 12px' }}>
          <div style={{ fontSize: 9, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 8px 6px', fontWeight: 600 }}>Menú</div>
          {[
            { label: 'Dashboard', path: '/dashboard', active: false, d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { label: 'Nodo', path: '/nodo', active: false, d: 'M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z' },
            { label: 'Historial', path: '/historial', active: false, d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Inventario', path: '/inventario', active: true, d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
          ].map(item => (
            <div key={item.label} onClick={() => router.push(item.path)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
              cursor: 'pointer', marginBottom: 2, fontSize: 13,
              background: item.active ? '#27272A' : 'transparent',
              color: item.active ? '#fff' : '#71717A',
              borderLeft: item.active ? '2px solid #0EA5E9' : '2px solid transparent'
            }}>
              <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.d} />
              </svg>
              {item.label}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #27272A' }}>
          <div style={{ fontSize: 11, color: '#52525B' }}>Gestión de inventario</div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E4E4E7', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em' }}>Inventario</h1>
          <button
            onClick={() => { setShowForm(!showForm); setEditando(null); setForm({ nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: '' }) }}
            style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: showForm ? '#F4F4F5' : '#0EA5E9', color: showForm ? '#71717A' : '#fff' }}
          >
            {showForm ? 'Cancelar' : '+ Agregar producto'}
          </button>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Total productos', value: productos.length, color: '#09090B', bg: '#fff' },
              { label: 'Stock bajo', value: stockBajo, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
              { label: 'Stock OK', value: stockOk, color: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: '18px 20px', border: `1px solid ${s.border || '#E4E4E7'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Formulario */}
          {showForm && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#09090B', marginBottom: 20 }}>
                {editando ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Nombre del producto', key: 'nombre', placeholder: 'Ej: Coca Cola 1.5L', type: 'text' },
                  { label: 'Categoría', key: 'categoria', placeholder: 'Ej: bebidas, snacks, lacteos', type: 'text' },
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
              <button
                onClick={handleSubmit}
                style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#0EA5E9', color: '#fff' }}
              >
                {editando ? 'Guardar cambios' : 'Agregar producto'}
              </button>
            </div>
          )}

          {/* Lista productos */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B' }}>Productos registrados</span>
              <span style={{ fontSize: 11, color: '#A1A1AA' }}>{productos.length} productos</span>
            </div>

            {productos.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#A1A1AA' }}>No hay productos registrados. Agrega el primero.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {['Producto', 'Categoría', 'Cámara', 'Stock', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ fontSize: 10, color: '#A1A1AA', padding: '10px 16px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid #F4F4F5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: i < productos.length - 1 ? '1px solid #F4F4F5' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#09090B' }}>{p.nombre}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#71717A' }}>{p.categoria}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#71717A' }}>{p.cameras?.name || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => handleStockUpdate(p.id, Math.max(0, p.stock_actual - 1))}
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >−</button>
                          <div style={{ textAlign: 'center', minWidth: 60 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: p.stock_actual <= p.stock_minimo ? '#EF4444' : '#22C55E', lineHeight: 1 }}>{p.stock_actual}</div>
                            <div style={{ fontSize: 9, color: '#A1A1AA', marginTop: 2 }}>{p.unidad}</div>
                          </div>
                          <button
                            onClick={() => handleStockUpdate(p.id, p.stock_actual + 1)}
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#22C55E', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >+</button>
                        </div>
                        <div style={{ fontSize: 10, color: '#A1A1AA', marginTop: 4 }}>Mín: {p.stock_minimo} {p.unidad}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: p.stock_actual <= p.stock_minimo ? '#FEE2E2' : '#DCFCE7', color: p.stock_actual <= p.stock_minimo ? '#EF4444' : '#16A34A' }}>
                          {p.stock_actual <= p.stock_minimo ? 'Stock bajo' : 'OK'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleEdit(p)}
                            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: '1px solid #E4E4E7', background: '#fff', color: '#71717A', cursor: 'pointer' }}
                          >Editar</button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: '1px solid #FECACA', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer' }}
                          >Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
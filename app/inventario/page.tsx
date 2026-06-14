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
    nombre: '',
    categoria: '',
    stock_actual: 0,
    stock_minimo: 5,
    unidad: 'unidades',
    camera_id: ''
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'dueno') {
        router.push('/dashboard')
        return
      }

      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async () => {
    const { data: productosData } = await supabase
      .from('productos')
      .select('*, cameras(name, location)')
      .order('created_at', { ascending: false })

    const { data: camerasData } = await supabase
      .from('cameras')
      .select('*')
      .eq('is_active', true)

    setProductos(productosData || [])
    setCameras(camerasData || [])
  }

  const handleSubmit = async () => {
    if (!form.nombre || !form.categoria) {
      alert('Nombre y categoría son obligatorios')
      return
    }

    if (editando) {
      await supabase
        .from('productos')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editando.id)
    } else {
      await supabase.from('productos').insert(form)
    }

    setForm({ nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: '' })
    setShowForm(false)
    setEditando(null)
    await loadData()
  }

  const handleEdit = (producto: any) => {
    setEditando(producto)
    setForm({
      nombre: producto.nombre,
      categoria: producto.categoria,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      unidad: producto.unidad,
      camera_id: producto.camera_id || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    await loadData()
  }

  const handleStockUpdate = async (id: string, nuevoStock: number) => {
    await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
      .eq('id', id)
    await loadData()
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin w-10 h-10" style={{ color: '#ea580c' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-gray-400 text-sm">Cargando inventario...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)' }}>

      {/* Navbar */}
      <nav className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">Inventario</p>
              <p className="text-gray-500 text-xs">VisionStock AI</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-xl text-sm transition text-gray-300 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Gestión de Inventario</h1>
            <p className="text-gray-500">Administra los productos y su stock mínimo</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditando(null); setForm({ nombre: '', categoria: '', stock_actual: 0, stock_minimo: 5, unidad: 'unidades', camera_id: '' }) }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}
          >
            {showForm ? 'Cancelar' : '+ Agregar producto'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="rounded-2xl p-6 mb-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(234,88,12,0.3)' }}>
            <h2 className="font-bold text-lg mb-4">{editando ? 'Editar producto' : 'Nuevo producto'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block uppercase tracking-wide">Nombre del producto</label>
                <input
                  type="text"
                  placeholder="Ej: Coca Cola 1.5L"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full text-white px-4 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block uppercase tracking-wide">Categoría</label>
                <input
                  type="text"
                  placeholder="Ej: Bebidas, Snacks, Lácteos"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full text-white px-4 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block uppercase tracking-wide">Stock actual</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock_actual}
                  onChange={(e) => setForm({ ...form, stock_actual: parseInt(e.target.value) || 0 })}
                  className="w-full text-white px-4 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block uppercase tracking-wide">Stock mínimo</label>
                <input
                  type="number"
                  min="1"
                  value={form.stock_minimo}
                  onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 1 })}
                  className="w-full text-white px-4 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block uppercase tracking-wide">Unidad</label>
                <select
                  value={form.unidad}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                  className="w-full text-white px-4 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="unidades">Unidades</option>
                  <option value="cajas">Cajas</option>
                  <option value="kg">Kilogramos</option>
                  <option value="litros">Litros</option>
                  <option value="paquetes">Paquetes</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block uppercase tracking-wide">Cámara asociada</label>
                <select
                  value={form.camera_id}
                  onChange={(e) => setForm({ ...form, camera_id: e.target.value })}
                  className="w-full text-white px-4 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="">Sin cámara asignada</option>
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>{cam.name} — {cam.location}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition"
                style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}
              >
                {editando ? 'Guardar cambios' : 'Agregar producto'}
              </button>
            </div>
          </div>
        )}

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-gray-400 text-xs mb-2">Total productos</p>
            <p className="text-2xl font-bold" style={{ color: '#fb923c' }}>{productos.length}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-gray-400 text-xs mb-2">Stock bajo</p>
            <p className="text-2xl font-bold text-red-400">{productos.filter(p => p.stock_actual <= p.stock_minimo).length}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-gray-400 text-xs mb-2">Stock OK</p>
            <p className="text-2xl font-bold text-green-400">{productos.filter(p => p.stock_actual > p.stock_minimo).length}</p>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {productos.length === 0 ? (
            <p className="text-gray-500 text-center p-8 text-sm">No hay productos registrados. Agrega el primero.</p>
          ) : (
            productos.map((p, i) => (
              <div
                key={p.id}
                className="px-5 py-4 flex justify-between items-center hover:bg-white/5 transition"
                style={{ borderBottom: i !== productos.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium">{p.nombre}</p>
                    {p.stock_actual <= p.stock_minimo && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)' }}>
                        Stock bajo
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">{p.categoria} · {p.cameras?.name || 'Sin cámara'}</p>
                  <p className="text-gray-600 text-xs mt-0.5">Mínimo: {p.stock_minimo} {p.unidad}</p>
                </div>

                {/* Control de stock */}
                <div className="flex items-center gap-3 mx-4">
                  <button
                    onClick={() => handleStockUpdate(p.id, Math.max(0, p.stock_actual - 1))}
                    className="w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center transition"
                    style={{ background: 'rgba(220,38,38,0.2)', color: '#f87171' }}
                  >
                    -
                  </button>
                  <div className="text-center min-w-16">
                    <p className="font-bold text-lg" style={{ color: p.stock_actual <= p.stock_minimo ? '#f87171' : '#4ade80' }}>
                      {p.stock_actual}
                    </p>
                    <p className="text-gray-600 text-xs">{p.unidad}</p>
                  </div>
                  <button
                    onClick={() => handleStockUpdate(p.id, p.stock_actual + 1)}
                    className="w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center transition"
                    style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}
                  >
                    +
                  </button>
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(p)}
                    className="px-3 py-1.5 rounded-lg text-xs transition"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-1.5 rounded-lg text-xs transition"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#f87171' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
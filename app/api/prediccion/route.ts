import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    // Obtener análisis de los últimos 30 días
    const hace30dias = new Date()
    hace30dias.setDate(hace30dias.getDate() - 30)

    const { data: analyses } = await supabase
      .from('analyses')
      .select('created_at, status, camera_id, cameras(name)')
      .eq('status', 'vacio')
      .gte('created_at', hace30dias.toISOString())
      .order('created_at', { ascending: true })

    if (!analyses || analyses.length === 0) {
      return NextResponse.json({
        prediccion: null,
        mensaje: 'No hay suficiente historial para predecir',
        horas_criticas: [],
        dias_criticos: []
      })
    }

    // Contar quiebres por hora del día
    const porHora: Record<number, number> = {}
    const porDia: Record<number, number> = {}
    const diasNombre = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    for (const a of analyses) {
      const fecha = new Date(a.created_at)
      const hora = fecha.getHours()
      const dia = fecha.getDay()
      porHora[hora] = (porHora[hora] || 0) + 1
      porDia[dia] = (porDia[dia] || 0) + 1
    }

    // Ordenar horas por frecuencia
    const horasCriticas = Object.entries(porHora)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hora, count]) => ({
        hora: parseInt(hora),
        label: `${hora}:00 - ${parseInt(hora) + 1}:00`,
        quiebres: count
      }))

    // Ordenar días por frecuencia
    const diasCriticos = Object.entries(porDia)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([dia, count]) => ({
        dia: parseInt(dia),
        label: diasNombre[parseInt(dia)],
        quiebres: count
      }))

    // Hora actual
    const horaActual = new Date().getHours()
    const horaTop = horasCriticas[0]?.hora

    // Predecir si estamos cerca de una hora crítica
    let alerta = false
    let mensajePrediccion = ''

    if (horaTop !== undefined && Math.abs(horaActual - horaTop) <= 1) {
      alerta = true
      mensajePrediccion = `Atención: históricamente los quiebres de stock ocurren frecuentemente alrededor de las ${horaTop}:00. Se recomienda revisar los estantes ahora.`
    } else if (horasCriticas.length > 0) {
      mensajePrediccion = `Los quiebres ocurren con mayor frecuencia a las ${horasCriticas[0].label}. Próxima hora crítica: ${horasCriticas[0].label}.`
    }

    return NextResponse.json({
      prediccion: {
        alerta,
        mensaje: mensajePrediccion,
        total_quiebres_analizados: analyses.length,
        periodo: 'últimos 30 días'
      },
      horas_criticas: horasCriticas,
      dias_criticos: diasCriticos
    })

  } catch (error) {
    console.error('Error en prediccion:', error)
    return NextResponse.json({ error: 'Error al generar predicción' }, { status: 500 })
  }
}
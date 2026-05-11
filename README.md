# Gia · Módulo Obstétrico Inteligente
### by Zenoxia

Prototipo funcional de la interfaz de Gia — sistema de seguimiento clínico para embarazos de alto riesgo, con foco en preeclampsia.

---

## Estructura del proyecto

```
gia-app/
├── index.html       # Login / pantalla de bienvenida
└── dashboard.html   # Dashboard clínico principal
```

## Cómo usar

1. Abrir `index.html` en el navegador
2. Ingresar cualquier correo y contraseña (modo demo)
3. El sistema redirige automáticamente al dashboard clínico

No requiere servidor ni dependencias. Es HTML/CSS/JS puro.

---

## Pantallas incluidas

- **Login** — Pantalla de bienvenida con branding Gia by Zenoxia
- **Dashboard** — Lista de pacientes ordenada por urgencia clínica
- **Ficha de paciente** — Tendencia de PA, signos vitales, alertas activas
- **Formulario de consulta** — Campos Tier A (obligatorios) y Tier B (opcionales)
- **Modal de alerta crítica** — Flujo de confirmación de conducta

---

## Design tokens

El sistema de diseño usa los tokens de Zenoxia definidos en `:root`:

| Variable | Uso |
|---|---|
| `--p` / `--p-dark` | Acciones primarias, topbar |
| `--s-err` / `--s-err-l` | Alertas críticas, riesgo alto |
| `--s-warn` / `--s-warn-l` | Alertas moderadas, vigilancia |
| `--s-ok` / `--s-ok-l` | Estados estables, confirmados |
| `--s-info` / `--s-info-l` | Información, vigilancia leve |

---

## Estado del proyecto

Este prototipo corresponde al **Sprint 0-1** de Gia.

- ✅ Interfaz de login
- ✅ Dashboard con lista de pacientes
- ✅ Ficha clínica con tendencia de PA
- ✅ Formulario de consulta con validaciones
- ✅ Modal de alerta crítica
- 🔜 Backend NestJS + PostgreSQL (Sprint 1 semanas 3-4)
- 🔜 Motor de alertas real
- 🔜 Timeline longitudinal

---

## Clasificación regulatoria

Gia es un **Software as a Medical Device (SaMD)** bajo normativa ANMAT Argentina (Disposición GMC 25/21 MERCOSUR). La gestión de riesgos sigue la norma ISO 14971.

---

*Zenoxia · Mayo 2026 · Confidencial*

# Product Requirements Document (PRD)
## Quotin Legal - Sistema de Gestión de Propuestas Legales con IA

**Versión:** 1.0  
**Última actualización:** 19 de enero de 2026  
**Estado:** En desarrollo activo  

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problem Statement](#problem-statement)
3. [Objetivos del Producto](#objetivos-del-producto)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Arquitectura del Sistema](#arquitectura-del-sistema)
6. [Módulos y Funcionalidades](#módulos-y-funcionalidades)
7. [Flujos de Usuario](#flujos-de-usuario)
8. [Modelo de Datos](#modelo-de-datos)
9. [Integraciones de IA](#integraciones-de-ia)
10. [Seguridad y Control de Acceso](#seguridad-y-control-de-acceso)
11. [Métricas de Éxito](#métricas-de-éxito)
12. [Roadmap](#roadmap)

---

## 🎯 Resumen Ejecutivo

**Quotin Legal** es una plataforma SaaS diseñada específicamente para despachos jurídicos y consultorías profesionales que automatiza y optimiza el ciclo completo de generación de propuestas comerciales, desde la captación inicial del cliente hasta la entrega del documento final listo para firma.

La plataforma utiliza **Inteligencia Artificial** para:
- Analizar conversaciones de ventas y extraer requerimientos
- Sugerir servicios relevantes basados en el contexto del cliente
- Generar contenido personalizado para propuestas
- Importar catálogos de servicios desde texto no estructurado

---

## 🔴 Problem Statement

### Problema Principal

Los despachos jurídicos y consultorías profesionales enfrentan **ineficiencias significativas** en su proceso de ventas:

1. **Tiempo excesivo en elaboración de propuestas**
   - Los abogados dedican 4-8 horas promedio por propuesta
   - Copiar y pegar de documentos anteriores genera errores
   - No hay estandarización en estructura ni pricing

2. **Falta de trazabilidad en el pipeline de ventas**
   - No existe visibilidad del estatus de cada propuesta
   - Dificultad para dar seguimiento a clientes potenciales
   - Pérdida de información de conversaciones iniciales

3. **Inconsistencia en la comunicación comercial**
   - Cada abogado redacta diferente
   - No hay textos estándar aprobados por la firma
   - Variación en la presentación de honorarios

4. **Gestión documental fragmentada**
   - Documentos dispersos en múltiples ubicaciones
   - Dificultad para validar expedientes completos
   - No hay control de versiones en plantillas

### Usuarios Afectados

| Rol | Dolor Principal |
|-----|----------------|
| **Socio/Director** | Falta de visibilidad del pipeline y métricas de conversión |
| **Abogado Senior** | Tiempo perdido en tareas administrativas vs. trabajo jurídico |
| **Abogado Asociado** | Incertidumbre sobre qué servicios ofrecer y cómo estructurar propuestas |
| **Asistente Legal** | Dificultad para gestionar documentos y dar seguimiento |

### Impacto Cuantificado

- **40% del tiempo** de socios se destina a tareas comerciales/administrativas
- **60% de propuestas** se pierden por falta de seguimiento oportuno
- **3-5 días** promedio de retraso en envío de propuestas
- **$50,000+ MXN** en ingresos perdidos por propuestas no enviadas a tiempo

---

## 🎯 Objetivos del Producto

### Objetivos Primarios (MVP)

| Objetivo | Métrica de Éxito | Plazo |
|----------|-----------------|-------|
| Reducir tiempo de creación de propuestas | De 4-8 hrs a < 30 min | Q1 2026 |
| Centralizar información de clientes | 100% de clientes activos migrados | Q1 2026 |
| Estandarizar catálogo de servicios | Catálogo completo con textos aprobados | Q1 2026 |
| Implementar análisis con IA | 80% de propuestas usan sugerencias IA | Q2 2026 |

### Objetivos Secundarios (Post-MVP)

- Generación automática de PDFs con marca de la firma
- Firma electrónica integrada
- Dashboard de métricas y conversión
- Integración con CRM externos

---

## 🛠 Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.3.x | Framework UI principal |
| **TypeScript** | 5.x | Tipado estático para mayor confiabilidad |
| **Vite** | 5.x | Build tool y dev server ultrarrápido |
| **Tailwind CSS** | 3.x | Sistema de diseño utility-first |
| **Shadcn/UI** | Latest | Componentes accesibles y personalizables |
| **TanStack Query** | 5.x | State management y cache de datos servidor |
| **React Router** | 6.x | Enrutamiento SPA |
| **React Hook Form** | 7.x | Gestión de formularios |
| **Zod** | 3.x | Validación de schemas |

### Backend & Base de Datos

| Tecnología | Propósito |
|------------|-----------|
| **Supabase** | Backend-as-a-Service (BaaS) |
| **PostgreSQL** | Base de datos relacional (via Supabase) |
| **Row Level Security (RLS)** | Control de acceso a nivel de fila |
| **Supabase Auth** | Autenticación y gestión de usuarios |
| **Supabase Storage** | Almacenamiento de archivos (documentos) |
| **Edge Functions (Deno)** | Lógica serverless para IA y procesamiento |

### Inteligencia Artificial

| Servicio | Modelo | Uso |
|----------|--------|-----|
| **Lovable AI Gateway** | Google Gemini 3 Flash Preview | Análisis de propuestas |
| **Lovable AI Gateway** | Google Gemini 2.5 Flash | Generación de contenido |
| **Lovable AI Gateway** | OpenAI GPT-5 Mini | Parsing de servicios |

### Herramientas de Desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| **ESLint** | Linting de código |
| **Vitest** | Testing unitario |
| **Git/GitHub** | Control de versiones |
| **Lovable** | Plataforma de desarrollo AI-first |

### Librerías Adicionales

```
- html2canvas: Captura de elementos para PDF
- jsPDF: Generación de documentos PDF
- Handlebars: Motor de plantillas para compilación
- date-fns: Manipulación de fechas
- Lucide React: Iconografía
- Recharts: Visualización de datos
- Framer Motion: Animaciones (pendiente)
```

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React SPA (Vite)                      │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐│   │
│  │  │ Clientes│ │Propuesta│ │Servicios│ │  Plantillas     ││   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘│   │
│  │       │           │           │                │         │   │
│  │  ┌────┴───────────┴───────────┴────────────────┴────┐   │   │
│  │  │            TanStack Query (Cache Layer)          │   │   │
│  │  └──────────────────────┬───────────────────────────┘   │   │
│  └─────────────────────────┼───────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┼───────────────────────────────────┐
│                     SUPABASE CLOUD                              │
│  ┌─────────────────────────┼───────────────────────────────┐   │
│  │                    API Gateway                           │   │
│  │  ┌─────────────────┐  ┌─┴──────────────────────────────┐│   │
│  │  │   Auth Service  │  │      PostgREST API             ││   │
│  │  └────────┬────────┘  └──────────────┬─────────────────┘│   │
│  └───────────┼──────────────────────────┼──────────────────┘   │
│              │                          │                       │
│  ┌───────────┴──────────────────────────┴──────────────────┐   │
│  │                    PostgreSQL                            │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │   │
│  │  │clients │ │ cases  │ │services│ │templates│ │profiles│ │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │   │
│  │                     + RLS Policies                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Edge Functions (Deno)                   │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │   │
│  │  │analyze-      │ │generate-     │ │parse-services-   │  │   │
│  │  │proposal      │ │proposal-     │ │from-text         │  │   │
│  │  │              │ │content       │ │                  │  │   │
│  │  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘  │   │
│  └─────────┼────────────────┼──────────────────┼────────────┘   │
│            │                │                  │                 │
└────────────┼────────────────┼──────────────────┼─────────────────┘
             │                │                  │
┌────────────┴────────────────┴──────────────────┴─────────────────┐
│                      LOVABLE AI GATEWAY                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Gemini 3 Flash  │  │ Gemini 2.5 Flash│  │ GPT-5 Mini      │  │
│  │ (Analysis)      │  │ (Generation)    │  │ (Parsing)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 Módulos y Funcionalidades

### 1. 🏢 Módulo de Clientes (CRM)

**Propósito:** Gestionar grupos empresariales, razones sociales y contactos.

#### Funcionalidades

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **Wizard de Alta** | Proceso guiado de 4 pasos para crear clientes | ✅ Completado |
| **Gestión de Entidades** | Múltiples razones sociales por grupo | ✅ Completado |
| **Contactos Principales** | Registro de decisores con cargo y datos | ✅ Completado |
| **Documentos por Entidad** | Subida y validación de documentos | ✅ Completado |
| **Estados de Cliente** | Incompleto → Activo → Inactivo | ✅ Completado |

#### Flujo: Alta de Cliente

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Paso 1       │──▶│ Paso 2       │──▶│ Paso 3       │──▶│ Paso 4       │
│ Info Básica  │   │ Entidades    │   │ Documentos   │   │ Validación   │
│              │   │ (Razones     │   │ (CSF, ID,    │   │ (Resumen y   │
│ - Nombre     │   │  Sociales)   │   │  Actas)      │   │  Confirmación│
│ - Alias      │   │              │   │              │   │              │
│ - Industria  │   │ - RFC        │   │ - Upload     │   │ ✓ Crear      │
│ - Empleados  │   │ - Nombre     │   │ - Notas      │   │              │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

#### Modelo de Datos

```sql
clients
├── id (UUID, PK)
├── group_name (TEXT) -- Nombre del grupo empresarial
├── alias (TEXT) -- Nombre corto
├── industry (TEXT)
├── employee_count (INT)
├── annual_revenue (TEXT)
├── status (TEXT) -- incompleto | activo | inactivo
├── notes (TEXT)
├── created_by (UUID, FK → auth.users)
└── timestamps

client_entities
├── id (UUID, PK)
├── client_id (UUID, FK → clients)
├── legal_name (TEXT) -- Razón social
└── rfc (TEXT)

client_contacts
├── id (UUID, PK)
├── client_id (UUID, FK → clients)
├── full_name (TEXT)
├── position (TEXT)
├── email (TEXT)
├── phone (TEXT)
└── is_primary (BOOLEAN)

client_documents
├── id (UUID, PK)
├── entity_id (UUID, FK → client_entities)
├── document_type (TEXT) -- CSF, INE, ACTA, etc.
├── file_url (TEXT)
├── status (TEXT) -- pendiente | recibido | validado | rechazado
└── validated_by (UUID)
```

---

### 2. 📝 Módulo de Propuestas (Core)

**Propósito:** Crear, editar y gestionar propuestas comerciales con asistencia de IA.

#### Funcionalidades

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **Creación con IA** | Analiza notas de conversación para sugerir servicios | ✅ Completado |
| **Editor Dual** | Panel izquierdo (edición) + Panel derecho (preview) | ✅ Completado |
| **Vista Clásica** | Preview en tiempo real con formato profesional | ✅ Completado |
| **Plantilla Compilada** | Inyección de datos en plantillas predefinidas | ✅ Completado |
| **Generación IA** | Contenido personalizado por servicio | ✅ Completado |
| **Modos de Pricing** | Por servicio / Global / Cuotas | ✅ Completado |
| **Versionamiento** | Historial de cambios por propuesta | ✅ Completado |
| **Export PDF** | Generación de documento final | ✅ Completado |

#### Flujo: Creación de Propuesta

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CREAR PROPUESTA                               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. NUEVA PROPUESTA                                                   │
│    ┌────────────────────────────────────────────────────────────┐   │
│    │ • Seleccionar Cliente                                       │   │
│    │ • Tipo de Necesidad (fiscal, corporativo, litigio, etc.)  │   │
│    │ • Notas de Conversación (texto libre)                      │   │
│    └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ [Automático]
┌─────────────────────────────────────────────────────────────────────┐
│ 2. ANÁLISIS CON IA (Edge Function: analyze-proposal)                │
│    ┌────────────────────────────────────────────────────────────┐   │
│    │ Extrae:                                                     │   │
│    │ • Objetivos del cliente                                     │   │
│    │ • Riesgos identificados                                     │   │
│    │ • Servicios sugeridos (con match al catálogo)              │   │
│    │ • Nivel de urgencia                                         │   │
│    │ • Complejidad estimada                                      │   │
│    └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. EDITOR DE PROPUESTA (Vista Dual)                                  │
│ ┌─────────────────────────┐   ┌─────────────────────────────────┐  │
│ │   PANEL IZQUIERDO       │   │      PANEL DERECHO              │  │
│ │   (Edición)             │   │      (Preview)                  │  │
│ │                         │   │                                 │  │
│ │ • Destinatario          │   │ ┌─────────────────────────────┐ │  │
│ │ • Contexto/Antecedentes │   │ │                             │ │  │
│ │ • Servicios             │   │ │   DOCUMENTO EN              │ │  │
│ │   - Seleccionar         │   │ │   TIEMPO REAL               │ │  │
│ │   - Personalizar texto  │   │ │                             │ │  │
│ │   - Ajustar honorarios  │   │ │   • Membrete                │ │  │
│ │ • Modo de pricing       │   │ │   • Fecha                   │ │  │
│ │ • Plantilla             │   │ │   • Destinatario            │ │  │
│ │                         │   │ │   • Antecedentes            │ │  │
│ │ [Generar con IA]        │   │ │   • Servicios               │ │  │
│ │                         │   │ │   • Honorarios              │ │  │
│ └─────────────────────────┘   │ │   • Cierre                  │ │  │
│                               │ └─────────────────────────────┘ │  │
│                               └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. ACCIONES FINALES                                                  │
│    • Guardar borrador                                                │
│    • Exportar PDF                                                    │
│    • Enviar al cliente                                               │
│    • Marcar como ganada/perdida                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Estados de Propuesta (Pipeline)

```
nuevo → docs_solicitados → docs_recibidos → en_analisis → borrador 
     → revision → enviada → negociacion → ganada/perdida/archivada
```

#### Modelo de Datos

```sql
cases (Propuestas)
├── id (UUID, PK)
├── client_id (UUID, FK → clients)
├── title (TEXT)
├── status (ENUM case_status)
├── need_type (TEXT)
├── notes (TEXT) -- Notas de conversación inicial
├── pricing_mode (TEXT) -- per_service | summed | global
├── urgency (ENUM) -- inmediata | 30_dias | 90_dias
├── complexity (ENUM) -- baja | media | alta
├── scope (ENUM) -- diagnostico | implementacion | continuo
│
├── -- Datos de IA
├── ai_analysis (JSONB) -- Resultado del análisis
├── ai_status (TEXT) -- pending | completed | error
├── ai_analyzed_at (TIMESTAMP)
│
├── -- Pricing
├── selected_pricing_id (UUID, FK → pricing_templates)
├── custom_initial_payment (NUMERIC)
├── custom_monthly_retainer (NUMERIC)
├── custom_retainer_months (INT)
│
├── -- Template
├── selected_template_id (UUID, FK → document_templates)
├── proposal_content (JSONB) -- Contenido generado
│
└── timestamps

case_services
├── id (UUID, PK)
├── case_id (UUID, FK → cases)
├── service_id (UUID, FK → services)
├── custom_text (TEXT) -- Override del texto estándar
├── custom_fee (NUMERIC)
├── custom_monthly_fee (NUMERIC)
└── sort_order (INT)

proposal_versions
├── id (UUID, PK)
├── case_id (UUID, FK → cases)
├── version_number (INT)
├── content (JSONB) -- Snapshot del contenido
├── created_by (UUID)
└── created_at (TIMESTAMP)
```

---

### 3. 📚 Módulo de Servicios (Catálogo)

**Propósito:** Mantener el catálogo de servicios profesionales con textos estándar y pricing.

#### Funcionalidades

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **CRUD de Servicios** | Alta, edición, eliminación | ✅ Completado |
| **Importación con IA** | Parseo de texto libre a servicios estructurados | ✅ Completado |
| **Tipos de Cobro** | Único / Iguala / Mixto | ✅ Completado |
| **Textos Estándar** | Descripción aprobada para propuestas | ✅ Completado |
| **Acciones Masivas** | Activar/Desactivar/Eliminar múltiples | ✅ Completado |
| **Búsqueda y Ordenación** | Filtros en tabla | ✅ Completado |

#### Flujo: Importación con IA

```
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 1: PEGAR TEXTO                                                  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Textarea para pegar contenido de:                               │ │
│ │ • Página web del despacho                                       │ │
│ │ • Catálogo de servicios en PDF                                  │ │
│ │ • Lista de precios                                              │ │
│ │ • Cualquier documento descriptivo                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                        [Analizar con IA]                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ [Edge Function: parse-services-from-text]
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 2: REVISAR SERVICIOS DETECTADOS                                 │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Lista de servicios parseados:                                   │ │
│ │                                                                 │ │
│ │ ☑ Consultoría Fiscal Integral                    [Mixto] [✏️]  │ │
│ │   "Asesoría estratégica para optimizar..."                     │ │
│ │                                                                 │ │
│ │ ☑ Litigio Administrativo                         [Único] [✏️]  │ │
│ │   "Defensa ante autoridades fiscales..."                       │ │
│ │                                                                 │ │
│ │ ⚠️ Derecho Corporativo (Similar existente)      [Mixto] [✏️]  │ │
│ │                                                                 │ │
│ │ [Editar nombre, descripción, texto estándar, tipo de cobro]    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                        [Continuar → ]                                │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 3: CONFIRMAR IMPORTACIÓN                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Listo para importar 15 servicios                             │ │
│ │                                                                 │ │
│ │ Servicios a importar:                                          │ │
│ │ • Consultoría Fiscal Integral (Mixto)                          │ │
│ │ • Litigio Administrativo (Único)                               │ │
│ │ • ...                                                          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                        [Importar 15 Servicios]                       │
└─────────────────────────────────────────────────────────────────────┘
```

#### Modelo de Datos

```sql
services
├── id (UUID, PK)
├── name (TEXT)
├── description (TEXT) -- Descripción corta
├── standard_text (TEXT) -- Texto estándar para propuestas
├── fee_type (TEXT) -- one_time | monthly | both
├── suggested_fee (NUMERIC) -- Honorario único sugerido
├── suggested_monthly_fee (NUMERIC) -- Iguala sugerida
├── objectives_template (TEXT) -- Plantilla de objetivos
├── deliverables_template (TEXT) -- Plantilla de entregables
├── is_active (BOOLEAN)
├── sort_order (INT)
└── timestamps
```

---

### 4. 📄 Módulo de Plantillas (Machotes)

**Propósito:** Gestionar documentos base con bloques dinámicos y compilación automática.

#### Funcionalidades

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **Editor Rich Text** | TipTap con marcadores de bloques | ✅ Completado |
| **Tipos de Bloque** | Estático / Variable / Dinámico (IA) | ✅ Completado |
| **Análisis de Seguridad** | Detección de términos sensibles | ✅ Completado |
| **Versionamiento** | Control de versiones con parent_id | ✅ Completado |
| **Workflow de Aprobación** | Draft → Review → Approved | ✅ Completado |
| **Compilador Handlebars** | Inyección de datos en variables | ✅ Completado |

#### Tipos de Bloques

| Tipo | Icono | Comportamiento |
|------|-------|----------------|
| **Estático** | 🔒 | Texto fijo, no cambia entre propuestas |
| **Variable** | 📝 | Se reemplaza con datos del contexto (Handlebars) |
| **Dinámico** | ✨ | Se genera con IA según instrucciones |

#### Variables Disponibles

```handlebars
{{client.group_name}}
{{client.alias}}
{{client.industry}}
{{#each entities}}
  {{this.legal_name}} - {{this.rfc}}
{{/each}}
{{recipient.name}}
{{recipient.position}}
{{today}}
{{#each services}}
  {{this.name}}: {{this.description}}
{{/each}}
{{pricing.initial_payment}}
{{pricing.monthly_retainer}}
{{firm.name}}
{{firm.logo_url}}
```

#### Modelo de Datos

```sql
document_templates
├── id (UUID, PK)
├── name (TEXT)
├── description (TEXT)
├── version (TEXT) -- v1.0, v1.1, etc.
├── status (TEXT) -- draft | review | approved
├── content (JSONB) -- Contenido TipTap JSON
├── schema_json (JSONB) -- Bloques estructurados
├── canonical_content (JSONB) -- Contenido normalizado
├── ai_instructions (JSONB) -- Instrucciones por bloque dinámico
├── analysis_result (JSONB) -- Resultado del análisis IA
├── parent_template_id (UUID, FK → self) -- Para versionamiento
├── source_type (TEXT) -- manual | upload | ai
├── reviewed_by (UUID)
├── approved_by (UUID)
├── is_active (BOOLEAN)
└── timestamps
```

---

### 5. 💰 Módulo de Honorarios (Pricing Templates)

**Propósito:** Definir esquemas de cobro reutilizables.

#### Funcionalidades

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **Plantillas de Precio** | Esquemas predefinidos | ✅ Completado |
| **Split de Pagos** | Configuración 50/50, 70/30, etc. | ✅ Completado |
| **Exclusiones** | Texto de lo no incluido | ✅ Completado |
| **Activación** | Habilitar/deshabilitar templates | ✅ Completado |

#### Modelo de Datos

```sql
pricing_templates
├── id (UUID, PK)
├── name (TEXT)
├── initial_payment (NUMERIC)
├── initial_payment_split (TEXT) -- "50/50", "70/30"
├── monthly_retainer (NUMERIC)
├── retainer_months (INT) -- Default 12
├── exclusions_text (TEXT)
├── is_active (BOOLEAN)
└── timestamps
```

---

### 6. 📁 Módulo de Documentos

**Propósito:** Gestionar documentos requeridos por caso/propuesta.

#### Funcionalidades

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **Checklist Dinámico** | Documentos requeridos por tipo de servicio | ✅ Completado |
| **Estados de Documento** | Pendiente → Recibido → Validado / Rechazado | ✅ Completado |
| **Almacenamiento** | Subida a Supabase Storage | ✅ Completado |
| **Validación** | Registro de quién validó y cuándo | ✅ Completado |

#### Modelo de Datos

```sql
case_documents
├── id (UUID, PK)
├── case_id (UUID, FK → cases)
├── checklist_item_id (UUID, FK → checklist_items)
├── name (TEXT)
├── file_url (TEXT)
├── status (ENUM) -- pendiente | recibido | validado | rechazado
├── notes (TEXT)
├── validated_by (UUID)
├── validated_at (TIMESTAMP)
└── timestamps

checklist_items
├── id (UUID, PK)
├── name (TEXT)
├── description (TEXT)
├── is_default (BOOLEAN)
└── sort_order (INT)
```

---

### 7. ⚙️ Módulo de Configuración

**Propósito:** Personalizar la información de la firma.

#### Campos Configurables

| Campo | Uso |
|-------|-----|
| **Nombre de la Firma** | Membrete y documentos |
| **Logo** | Encabezado de propuestas |
| **Dirección** | Membrete |
| **Teléfono / Email / Web** | Datos de contacto |
| **Texto de Cierre** | Párrafo final de propuestas |
| **Garantías** | Compromisos estándar |
| **Disclaimers** | Avisos legales |

---

### 8. 👥 Módulo de Usuarios

**Propósito:** Gestionar acceso y roles.

#### Roles del Sistema

| Rol | Permisos |
|-----|----------|
| **admin** | Acceso total, gestión de usuarios, configuración |
| **abogado** | CRUD clientes, propuestas, servicios |
| **asistente** | Crear/editar (no eliminar), upload documentos |

#### Modelo de Datos

```sql
profiles
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── full_name (TEXT)
├── email (TEXT)
├── avatar_url (TEXT)
└── timestamps

user_roles
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── role (ENUM) -- admin | abogado | asistente
└── created_at
```

---

## 🤖 Integraciones de IA

### Edge Functions

| Función | Endpoint | Modelo | Propósito |
|---------|----------|--------|-----------|
| `analyze-proposal` | `/functions/v1/analyze-proposal` | Gemini 3 Flash | Analizar notas y sugerir servicios |
| `generate-proposal-content` | `/functions/v1/generate-proposal-content` | Gemini 2.5 Flash | Generar texto personalizado |
| `generate-dynamic-content` | `/functions/v1/generate-dynamic-content` | Gemini 2.5 Flash | Compilar bloques dinámicos |
| `parse-services-from-text` | `/functions/v1/parse-services-from-text` | GPT-5 Mini | Extraer servicios de texto libre |
| `analyze-template` | `/functions/v1/analyze-template` | Gemini 2.5 Flash | Detectar términos sensibles |

### Flujo de Análisis de Propuesta

```
┌─────────────────┐
│ Notas de        │
│ conversación    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   analyze-proposal                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Prompt System:                                              │ │
│  │ "Eres un consultor de desarrollo de negocios para una     │ │
│  │  firma de abogados. Analiza las notas de la conversación  │ │
│  │  y extrae: objetivos, riesgos, servicios sugeridos..."    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Response (JSONB):                                                │
│ {                                                                │
│   "summary": "Cliente busca restructura fiscal...",             │
│   "objectives": ["Optimizar carga tributaria", ...],            │
│   "risks": ["Posible revisión del SAT", ...],                   │
│   "suggestedServices": [                                         │
│     { "name": "Consultoría Fiscal", "matchScore": 0.95 },       │
│     { "name": "Blindaje Patrimonial", "matchScore": 0.87 }      │
│   ],                                                             │
│   "urgency": "30_dias",                                          │
│   "complexity": "alta"                                           │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Seguridad y Control de Acceso

### Row Level Security (RLS)

Todas las tablas tienen políticas RLS activadas:

```sql
-- Ejemplo: cases
CREATE POLICY "Authenticated users can view cases"
  ON cases FOR SELECT USING (true);

CREATE POLICY "Admins and abogados can manage cases"
  ON cases FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'abogado'));

CREATE POLICY "Asistentes can create and update cases"
  ON cases FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'asistente'));
```

### Funciones de Seguridad

```sql
-- Verificar rol de usuario
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Obtener rol de usuario
CREATE FUNCTION get_user_role(_user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM user_roles
  WHERE user_id = _user_id LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;
```

### Primer Usuario = Admin

El trigger `handle_new_user` asigna automáticamente:
- Primer usuario → rol `admin`
- Usuarios subsecuentes → rol `asistente`

---

## 📊 Métricas de Éxito

### KPIs Principales

| Métrica | Baseline | Target Q1 | Target Q2 |
|---------|----------|-----------|-----------|
| Tiempo promedio de propuesta | 6 hrs | 45 min | 20 min |
| Propuestas creadas por semana | 3 | 10 | 15 |
| Tasa de uso de sugerencias IA | 0% | 60% | 85% |
| Clientes con expediente completo | 30% | 70% | 90% |
| Tasa de conversión propuesta→cliente | 25% | 35% | 45% |

### Métricas Técnicas

| Métrica | Target |
|---------|--------|
| Tiempo de carga inicial | < 2s |
| Tiempo de respuesta IA | < 5s |
| Uptime | 99.5% |
| Error rate | < 1% |

---

## 🗺 Roadmap

### ✅ Fase 1: MVP (Completado)

- [x] Autenticación y roles
- [x] CRUD de clientes con wizard
- [x] Catálogo de servicios
- [x] Creación de propuestas
- [x] Análisis con IA
- [x] Editor de propuestas dual
- [x] Vista previa en tiempo real
- [x] Plantillas de honorarios
- [x] Gestión de documentos
- [x] Importación de servicios con IA

### 🔄 Fase 2: En Desarrollo

- [x] Plantillas con bloques dinámicos
- [x] Compilador de plantillas (Handlebars)
- [x] Generación de contenido por servicio
- [x] Versionamiento de propuestas
- [ ] Export PDF profesional
- [ ] Firma electrónica básica

### 📅 Fase 3: Próximo (Q2 2026)

- [ ] Dashboard de métricas
- [ ] Reportes de conversión
- [ ] Notificaciones por email
- [ ] Recordatorios automáticos
- [ ] Integración con calendario
- [ ] API pública

### 🔮 Fase 4: Futuro

- [ ] App móvil (React Native)
- [ ] Integración CRM (HubSpot, Salesforce)
- [ ] OCR para documentos
- [ ] Chatbot de atención
- [ ] Multi-idioma
- [ ] Multi-tenant (SaaS)

---

## 📞 Contacto

**Proyecto:** Quotin Legal  
**URL:** https://quotin-legal.lovable.app  
**Repositorio:** Lovable Cloud  

---

*Documento generado el 19 de enero de 2026*

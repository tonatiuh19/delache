# Proceso de Peritaje Eléctrico — 12 puntos (versión completa)

Fuente operativa canónica. El producto DELACHE implementa estos puntos como `CASE_STATUS_FLOW` (`intake` → `accounting` → `completed`). Las reglas ejecutables viven en `shared/processGates.ts`.

Los nombres de personas son **ejemplos de ocupación de rol**, no el proceso. Si alguien falta, el rol sigue existiendo.

| Rol de proceso | Actor de sistema | Ejemplo |
|----------------|------------------|---------|
| Despacho jurídico | `law_firm` | Firma externa que envía el asunto |
| Coordinación operativa + QA documental | `coordinator` / `qa` | Ulises Enrique León López |
| Perito asignado | `expert` (assignment `is_primary`) | Responsable absoluto del expediente |
| Redacción de cuestionario | `questionnaire_author` | Josué Noé Mendoza Luengas (puede ser el mismo perito) |
| Legal interno | `legal` / `legal_reviewer` | Área jurídica de la consultoría |
| Jefe técnico | `technical_director` | Jefe de la Consultoría |
| Logística | `logistics` | Coordinación de viaje y viáticos |
| Contador | `accountant` | Erick Flores Martínez |
| Administración | `admin` | Plataforma, usuarios, listado |

**Un solo listado:** *Listado General de Demandas* (antes Relación / Control / Listado). Es el tablero de expedientes. Columnas: ver § Listado.

**Días hábiles:** lunes–viernes, excluyendo días inhábiles oficiales de México. El día 0 es el día hábil del evento disparador (no se cuenta). Semáforo: verde / amarillo (<2 días) / rojo (vencido).

**Estados laterales (no son puntos):** `on_hold` (pausa con motivo) y `cancelled` (cierre sin dictamen). El coordinador reanuda **al punto donde se pausó**; solo admin puede saltar a otro punto. Hold/cancel no evalúan gates.

---

## Relojes (SLA)

| Reloj | Punto | Días hábiles | Disparo | Anidación |
|-------|-------|--------------|---------|-----------|
| Cuestionario + GPS + QA | P3 | **3** | Entra a `questionnaire` | Independiente (antes de protesta) |
| Revisión jurídica interna del cuestionario | P4 | **2** | Entra a `legal_review_questionnaire` | Independiente |
| Plazo global de dictamen | P6 | **10** | Se **archiva la protesta del cargo** (`protesta`) | Padre |
| Validación del despacho | P10 | **3** | Se envía el dictamen al despacho | **Dentro de los 10** del P6 |

P7, P8, P9 y P11 no tienen reloj propio: deben terminar antes de que venzan los 10 días del P6.

Si el margen de 10 días no alcanza (viaje largo, rechazo del despacho), el coordinador pone `on_hold` o pide ampliación al juzgado y lo registra en bitácora. **No se “inventa” un día 11 en silencio.**

---

## RACI

R = Responsible (hace) · A = Accountable (un solo dueño) · C = Consulted · I = Informed

| Punto | Despacho | Coord. | Perito | Autor Q | QA | Legal int. | Jefe téc. | Logística | Contador |
|------:|:--------:|:------:|:------:|:-------:|:--:|:----------:|:---------:|:---------:|:--------:|
| 1 Recepción | R | **A** | | | | | | | I |
| 2 Asignación | | **A** | I | | I | I | | I | I |
| 3 Cuestionario / anticipo | | I | **A** | R | C | | | | I |
| 4 Revisión jurídica Q | I | I | C | | I | **A** | | | |
| 5 Docs del despacho | R | **A** | I | | | | | | |
| 6 Protesta + 10 días | | C | **A** | | | I | | | |
| 7 Logística | | I | C | | | | | **A** | I |
| 8 Inspección | | | **A** | | | | | C | |
| 9 Dictamen interno | | I | R | | C | | **A** | | |
| 10 Validación despacho | **A** | | C | | | | I | | |
| 11 Entrega / ratificación | I | C | **A** | | | | | | I |
| 12 Cobros | | I | | | | | | | **A** |

---

## Punto 1 — Recepción de la demanda inicial  
**Estatus:** `intake` · **A:** coordinador

El despacho carga en el **portal** (no WhatsApp como canal oficial): demanda, expediente médico, dictamen CFE y fotos preliminares, más juzgado, ciudad, actor y demandado.

**Artefactos (bloquean salir de P1):**

- `lawsuit` · `medical_record` · `cfe_report` · `preliminary_photo`

**Sistema:** crea expediente, número, notifica a coordinación, bitácora.

**Si faltan docs:** el expediente nace igual, el Listado marca `intakeComplete = no` y se alerta al despacho. No se avanza a P2 hasta el paquete mínimo, salvo `on_hold` pedido por admin.

---

## Punto 2 — Asignación de responsable y control administrativo  
**Estatus:** `assignment` · **A:** coordinador

Se asigna **un perito primario** (`is_primary`). Recomendado: coordinador, QA, legal, logística, contador.

**Bloquea salir:** no hay perito primario.

El Listado se actualiza al instante (perito, estatus). El coordinador confirma que el paquete de P1 llegó **íntegro** al perito (acceso al expediente, no reenvío por correo).

Arranca el reloj de **3 días** al pasar a P3.

---

## Punto 3 — Cuestionario, GPS, Street View y hito de anticipo  
**Estatus:** `questionnaire` · **SLA:** 3 días hábiles · **A:** perito asignado · **R:** autor del cuestionario

1. Redactar cuestionario de la **demandada** (y estructura para el de la actora).  
2. Ubicar el inmueble (dirección + **GPS**).  
3. Verificar preexistencia de la línea vs inmueble en **Street View** → resultado: *preexiste / no / no concluyente* + URL.  
4. Enviar a QA (gramática, datos, fechas).  
5. QA aprueba → estatus de cuestionario `approved`.

**Hito financiero:** solo con cuestionario **aprobado** (no basta “ya hay borrador”). Eso libera el **anticipo** en el Listado (`advanceReleased`) y avisa a contabilidad. La captura en Finanzas es operativa (no CFDI).

**Rechazo QA:** permanece en P3; el autor corrige. El reloj de 3 días no se reinicia salvo `on_hold` justificado.

**Bloquea salir:** GPS, Street View, cuestionario con QA aprobado (`legal_review` o `approved`). El anticipo se libera al pasar QA (entrada a `legal_review`), no al aprobar legal.

---

## Punto 4 — Revisión y aprobación jurídica (interna)  
**Estatus:** `legal_review_questionnaire` · **SLA:** 2 días hábiles · **A:** legal interno

Valida cuestionario y cronología. **No** es la presentación ante el juzgado (eso es P6/P11).

| Resultado | Destino |
|-----------|---------|
| Aprobado | P5 |
| Correcciones | **Regresa a P3** |
| Rechazo de fondo | `on_hold` o cancelación con motivo |

---

## Punto 5 — Documentos del despacho (primer filtro)  
**Estatus:** `additional_docs` · **A:** coordinador · **R:** despacho

**Siempre:** respuesta de demanda, croquis, cuestionario de la **parte actora**.  
**Si el asunto es por defunción:** acta de defunción.  
**Fotos adicionales:** recomendadas, no bloquean.

Si falta el cuestionario actora, el coordinador lo **solicita el mismo día hábil** (alerta + nota al despacho).

**Bloquea salir a inspección/dictamen (P8/P9):** sin cuestionario actora.  
**No bloquea la protesta (P6)** si el juzgado ya citó: se protesta y el Listado queda en rojo en `plaintiffQuestionnaire`.

---

## Punto 6 — Protesta del cargo y doble verificación  
**Estatus:** `court_acceptance` · **A:** perito

Aceptación formal ante el juez. El perito sube evidencia del **escrito de protesta** (`protesta`) y verifica el cuestionario actora.

**Disparo del reloj de 10 días hábiles:** archivo de `protesta` (no el simple cambio de estatus).

Logística (P7) puede **prepararse** antes si ya hay fecha de protesta o visita; el gasto se imputa al expediente.

---

## Punto 7 — Coordinación logística de la diligencia  
**Estatus:** `logistics` · **A:** logística · **Dentro de los 10 días**

Vuelos, hospedaje, vehículo, viáticos, fecha de inspección. Reutilizar GPS del P3.

**Listado:** `logisticsReady` cuando hay viaje o itinerario registrado. Comprobantes = gastos del expediente (captura, no CFDI).

---

## Punto 8 — Inspección técnica (evidencia obligatoria)  
**Estatus:** `inspection` · **A:** perito · **Dentro de los 10 días**

No se cierra la inspección sin el catálogo:

| Grupo | Categorías |
|-------|------------|
| Mediciones | Distancia horizontal, vertical, entre postes |
| Red | Fachada, placa/ID de poste, estructuras, conductor |
| Entorno | Postes, banquetas, inmueble/construcción |
| Riesgo | Invasión / sobredimensión, observaciones de seguridad |

Cada pieza: foto o medición + GPS/hora si el dispositivo lo permite.

**Bloquea salir:** checklist incompleto **o** falta cuestionario actora.

---

## Punto 9 — Elaboración y revisión interna del dictamen  
**Estatus:** `technical_report` · **A:** jefe técnico · **R:** perito · **Dentro de los 10 días**

Estructura mínima: investigación, cuestionario demandada, cuestionario actora, catálogo fotográfico/métrico, conclusiones.

Flujo: perito → QA gramatical/fechas/catálogo → jefe técnico.

| Resultado | Destino |
|-----------|---------|
| Aprobado interno | P10 |
| Correcciones QA o jefe | Permanece en P9 |

**Bloquea salir:** dictamen con aprobación interna + cuestionario actora presente.

---

## Punto 10 — Validación del despacho jurídico  
**Estatus:** `legal_validation` · **SLA:** 3 días hábiles **dentro de los 10** · **A:** despacho

| Resultado | Destino |
|-----------|---------|
| Aprobado | P11 |
| Cambios | **Regresa a P9** (nueva versión) |
| Rechazo | P9 o `on_hold` |

Si el despacho se pasa de 3 días, el coordinador escala (alerta) y decide si se entrega al juzgado con constancia en bitácora. El reloj de 10 **no se estira** solo.

---

## Punto 11 — Entrega, ratificación y evidencia final  
**Estatus:** `court_delivery` · **A:** perito · **Dentro de los 10 días** (la comparecencia puede quedar calendarizada si el juzgado cita después; se documenta)

Secuencia de artefactos:

1. Borrador enviado al despacho (ya cubierto en P10)  
2. **Ingreso formal** (`court_filing`)  
3. Comparecencia y **ratificación** (`ratification`)

Con ratificación, el coordinador marca `attendedWithReport`. Eso **libera el finiquito** (`finalReleased`) para P12. El expediente aún no está cobrado.

---

## Punto 12 — Gestión y ejecución de cobros  
**Estatus:** `accounting` · **A:** contador

El contador trabaja **solo** off the Listado (no un Excel paralelo):

- Anticipos liberados en P3 (`advanceReleased`) → gestiona cobro (`advancePaid`)  
- Finiquitos liberados en P11 (`finalReleased`) → gestiona cobro (`finalPaid`)

Captura interna de montos y estatus de pago. **No genera facturas fiscales (CFDI).**

Al cuadrar anticipo + finiquito (o justificar saldo), se pasa a `completed`. Facturas `issued` / `partially_paid` / `overdue`, y borradores de anticipo/finiquito, **bloquean** `completed`. Sin facturas no hay nada que cuadrar.

---

## Loops de rechazo (resumen)

```
P3 QA rechaza          → P3
P4 legal pide cambios  → P3
P8 checklist incompleto → P8 (no avanza)
P9 QA / jefe rechaza   → P9
P10 despacho pide cambios o rechaza → P9
```

---

## Listado General de Demandas (columnas)

`caseNumber`, `title`, `court`, `city`, `lawFirm`, `primaryExpert`, `processPoint`, `status`, `intakeComplete`, `questionnaireApproved`, `streetViewDone`, `advanceReleased`, `advancePaid`, `plaintiffQuestionnaire`, `protestaFiled`, `clock10DueAt`, `logisticsReady`, `inspectionComplete`, `reportInternalOk`, `reportFirmOk`, `ratified`, `attendedWithReport`, `finalReleased`, `finalPaid`.

Ese es el único tablero de avance y cobro.

---

## Implementación en DELACHE

| Pieza | Dónde |
|-------|--------|
| Estatus 1–12 | `shared/caseWorkflow.ts` |
| Gates / RACI / SLA | `shared/processGates.ts` |
| Docs P1 / P5 / protesta-ratificación | `shared/documentCompleteness.ts` |
| Checklist P8 | `shared/evidenceRules.ts` |
| Anticipo / finiquito (reglas) | `shared/automationRules.ts` |
| UI del riel de 12 puntos | Case detail (staff) — `ProcessTimeline` + `processGate` del GET |
| Listado único | `GET /api/cases` adjunta `listado`, `lawFirmName`, `primaryExpertName`. Grid staff: columnas punto / perito / despacho / reloj / avance. |
| Avance de estatus | `PATCH /api/cases/:uuid/status` evalúa gates (409 + `missing[]`). Hold/cancel no se bloquean. Reanudación: coordinador al punto pausado (o último flujo / intake); admin puede saltar. P4/P10 `changes_requested` → P3/P9 y reabre el artefacto. P4/P10 `rejected` (fondo) → `on_hold` y fuerza el artefacto a `changes_requested` para que el autor pueda editar al reanudar. Relojes tipados (`questionnaire` / `legal_review` / `external_legal_validation`) se completan al salir del estatus. El contador puede completar P12 (`accounting` → `completed`). |
| Categoría de documento | Upload y `PATCH …/documents/:documentUuid` (staff todas; despacho solo P1/P5). Los gates leen `documents.category`. |
| Alertas de faltantes | Staff + contactos del despacho en intake/P5. Nota `law_firm` solo en P5. |
| GPS P3 | `content_json.propertyGps` del cuestionario escribe `cases.property_lat/lng`. |
| Días hábiles | Lun–vie excluyendo días inhábiles oficiales de México (LFT art. 74). |
| Reloj de 10 días | Empieza al archivar `protesta` (o al entrar a P6 si ya está archivada). No al mero cambio de estatus. |
| Fallecimiento | Flag `involves_fatality` (no se infiere del acta). Condiciona `death_certificate`. |

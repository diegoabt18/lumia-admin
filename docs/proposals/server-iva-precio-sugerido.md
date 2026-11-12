# Propuesta: IVA en el precio sugerido y la publicación de precios (Server)

Estado: **aplicada en el Server el 2026-11-08** (sin commit), con las recomendaciones de la sección 2 como decisiones:
redondeo del precio final, sin envío si el IVA no está configurado, sin cambios en el costo de materiales y
solicitudes anteriores no publicables. Ver "Aplicación" al final.
Fecha: 2026-11-08. Origen: etapa 14 de Lumia Admin (`docs/modules.md`, punto 70).

## 1. Problema

El flujo receta → precio de tienda mezcla dos bases distintas:

| Paso | Código | Base |
|---|---|---|
| Precio sugerido | `CostingService.calculateRecipeCost` → `calculateSuggestedPrice` (`production/domain/value-objects/cost-breakdown.vo.ts`) | `costo × (1 + margen/100)`, redondeado hacia arriba a `priceRounding`. **Sin IVA** |
| Solicitud de aprobación | `VariantPriceRepostService.repostVariantPrice` → `approvals.create({ suggestedPrice })` | Copia el sugerido sin IVA |
| Publicación | `PriceApprovalService.publish` → `products.updateVariantPrice(sku, approval.suggestedPrice)` | Escribe el sugerido como `price` de la variante |
| Precio de tienda | `sales/domain/tax.ts` (`includedTaxAmount`), `order-financial-events.service.ts` | **IVA incluido** (`price` es precio final) |

Resultado: al publicar, el sugerido sin IVA pasa a ser un precio con IVA.

Ejemplo con IVA del 19 %, costo $5.000 y margen 100 %:

| | Esperado | Publicado hoy |
|---|---|---|
| Precio final (tienda) | $11.900 | $10.000 |
| Base sin IVA | $10.000 | $8.403 |
| Ganancia sobre costo | $5.000 (100 %) | $3.403 (68 %) |

Con IVA del 19 % la base real queda un 16 % por debajo de lo calculado, y la ganancia puede caer mucho más.

Ya existe un cálculo con IVA, `calculatePrice` en el mismo archivo, que usan las simulaciones de `admin-pricing`. Pero aplica el IVA **global** de la configuración (`taxPercentage`), no el del producto (`products.tax_rate`), y el flujo de recetas no lo usa.

## 2. Decisiones de negocio que hay que tomar antes

1. **Redondeo.** ¿Se redondea el precio final con IVA (el que ve el cliente) o la base sin IVA?
   *Recomendación:* redondear el precio final, porque es el que se exhibe. La base se deriva de él.
2. **Productos sin IVA configurado** (`tax_rate = null`). Hoy `null` significa "sin dato", no "exento".
   *Recomendación:* no enviar a aprobación una variante cuyo producto tenga `tax_rate = null`, y pedir configurarlo (0 si está excluido o exento). Así nunca se publica un precio con base ambigua.
3. **Costo de materiales.** ¿Los precios de compra registrados incluyen el IVA pagado? Si la empresa descuenta IVA, el costo debería ser sin IVA.
   Es una pregunta para el contador. No cambia esta propuesta, pero sí el resultado del margen.
4. **Solicitudes existentes.** ¿Se rechazan las solicitudes pendientes o aprobadas creadas con la regla vieja, o se permite publicarlas con confirmación?
   *Recomendación:* marcarlas como "base antigua" y no permitir publicarlas desde el Server, para que se vuelvan a enviar.

## 3. Diseño propuesto

Principio: **el margen de la receta sigue siendo un recargo sobre el costo (sin IVA)**. El IVA es propiedad del **producto** y se aplica al pasar de la receta a la variante (envío a aprobación), no en la receta.

### 3.1 Función pura nueva

`production/domain/value-objects/cost-breakdown.vo.ts`:

```ts
export interface ShelfPrice {
  netPrice: number            // costo × (1 + margen), sin redondear
  taxRate: number             // % del producto (0–100)
  grossPrice: number          // precio final con IVA, redondeado hacia arriba a `rounding`
  netFromGross: number        // grossPrice / (1 + taxRate/100), 2 decimales
  taxAmount: number           // grossPrice − netFromGross
  effectiveMarkupPercent: number // (netFromGross − costo) / costo × 100
}

export function calculateShelfPrice(input: {
  totalCost: number
  marginPercentage: number
  taxRate: number
  rounding: number
}): ShelfPrice
```

- Valida `totalCost > 0`, `0 ≤ taxRate ≤ 100`, `rounding > 0` y `marginPercentage ≥ 0`.
- `grossPrice = ceil(netPrice × (1 + taxRate/100) / rounding) × rounding`.
- `calculateSuggestedPrice` no cambia: la receta conserva su precio sugerido sin IVA, que es su referencia de costo.

### 3.2 Envío a aprobación (`VariantPriceRepostService`)

- `repostProductPrices` ya carga el producto con `findBySlugOrId`, cuyo `ProductDomain` incluye `taxRate`: hay que pasar ese valor a `repostVariantPrice`. `priceRounding` ya llega en `breakdown.config`.
- Si `taxRate == null`, la variante se agrega a `errors` con el mensaje "Configura el IVA del producto (0 si está excluido)" y no se crea la solicitud (decisión 2).
- Calcular `calculateShelfPrice` con `breakdown.totalCost`, `breakdown.marginPercentage`, `taxRate` y `priceRounding` de la configuración.
- Guardar en la solicitud y en la hoja de costo:
  - `suggested_price` = `grossPrice`, el precio que se publicará.
  - `suggested_price_net` = `netFromGross`.
  - `tax_rate` = la tasa usada (copia, por si el producto cambia después).
  - `price_basis` = `'tax_included'`.
- `updateVariantPricingState` guarda `suggestedPrice = grossPrice`, y en `production_data` también `netPrice` y `taxRate`.

### 3.3 Publicación (`PriceApprovalService.publish`)

1. **Validar todo antes de escribir.** Recorrer todas las ids y validar estado, `price_basis` y precio actual antes de publicar ninguna. Hoy un error a mitad del lote deja aplicadas las anteriores.
2. **Rechazar solicitudes con base antigua.** Si `price_basis !== 'tax_included'`, responder 409 "Solicitud creada con la regla anterior (sin IVA): recházala y vuelve a enviar el producto" (decisión 4).
3. **Comprobar el precio actual.** Si el `price` de la variante es distinto de `previous_price`, responder 409: alguien lo cambió después de crear la solicitud. Hoy esta protección vive solo en el BFF de Lumia Admin.
4. **Comprobar el IVA del producto.** Si `tax_rate` cambió desde la solicitud, responder 409 y pedir volver a enviar.
5. `updateVariantPrice(sku, approval.suggestedPrice)`, que ahora es el precio con IVA.

### 3.4 Entidades y repositorios

| Archivo | Cambio |
|---|---|
| `domain/price-approval.entity.ts` | Campos opcionales `suggested_price_net`, `tax_rate`, `price_basis` (entidad y dominio) |
| `infrastructure/price-approval.repository.ts` | Persistir y mapear los campos nuevos |
| `domain/cost-sheet.entity.ts`, `infrastructure/cost-sheet.repository.ts` | `createForVariant` acepta `taxRate` y `suggestedPriceNet` |
| `services/variant-price-repost.service.ts` | Punto 3.2 |
| `services/price-approval.service.ts` | Punto 3.3 (necesita leer la variante y el producto: `ProductRepository` ya está inyectado) |
| `services/costing.service.ts` | Sin cambios |
| `admin/services/admin-cost-summary.service.ts` (`recalculateProductRecipe`) | Opcional: guardar también `grossPrice` en `production` del producto |

No hacen falta migraciones: los campos nuevos son opcionales y su ausencia significa "base antigua".

## 4. Pruebas (vitest, `tests/unit`)

- `calculateShelfPrice`:
  - 19 % con costo $5.000 y margen 100 % → $11.900.
  - 0 % → igual que el sugerido.
  - Redondeo a 100 y a 1.000.
  - Errores con tasa fuera de rango, costo 0 y redondeo 0.
- `VariantPriceRepostService`:
  - Producto con 19 % → solicitud con `suggestedPrice` con IVA, `price_basis` y `tax_rate`.
  - Producto con `tax_rate = null` → error y sin solicitud.
- `PriceApprovalService.publish`:
  - Solicitud con base antigua → 409.
  - Precio actual distinto de `previous_price` → 409, y nada publicado.
  - Lote con una solicitud inválida → no se publica ninguna.
  - Caso correcto → `updateVariantPrice` con el precio con IVA.
- Ya existen `tests/unit/product-vat.test.ts` y `tax.test.ts` como referencia de estilo.

## 5. Compatibilidad y despliegue

- **Lumia (antigua) en modo `embedded`** tiene su propio flujo de aprobaciones (`lumia/server/api-embedded/admin/production/approvals/*`) sobre las mismas colecciones, y seguiría publicando precios sin IVA.
  - Con `NUXT_API_MODE=external`, Lumia usa el Server y el cambio la cubre.
  - Con `embedded`, hay que retirar o desactivar su módulo de producción. Si no, convive una ruta que salta estas reglas.
- **Solicitudes abiertas.** Antes de desplegar, revisar cuántas hay en estado `pending` o `approved`, que quedarán como "base antigua". Consulta de solo lectura:
  `db.price_approvals.countDocuments({ status: { $in: ['pending', 'approved'] } })` (colección `price_approvals`, según `price-approval.repository.ts`).
- **Precios ya publicados** con la regla antigua: este cambio no los corrige. Si se quiere revisarlos, hay que reenviar los productos a aprobación después del despliegue.
- **Orden recomendado:**
  1. Server con pruebas.
  2. Despliegue en un entorno de prueba.
  3. Ajuste de Lumia Admin.
  4. Producción.

## 6. Ajustes posteriores en Lumia Admin

- `shared/schemas/costing.ts`: leer `suggestedPriceNet`, `taxRate` y `priceBasis` en las solicitudes.
- Publicación:
  - Con base nueva no hace falta confirmar el IVA: se muestran el precio final, la base y el margen efectivo.
  - Con base antigua se muestra que no se puede publicar.
- Cuando el Server aplique 3.3, se pueden retirar del BFF las comprobaciones de precio cambiado y de lote. O mantenerlas como defensa adicional.
- Documentación: punto 70 de `docs/modules.md` y esta propuesta.

## 7. Fuera de alcance

- IVA por variante (hoy el IVA es del producto).
- Impuestos distintos del IVA, y el tratamiento contable del IVA en el costo de materiales (decisión 3).
- Cambiar el significado del margen de las recetas.

## Aplicación (2026-11-08)

Archivos modificados en `server` (sin commit):

- `src/modules/production/domain/value-objects/cost-breakdown.vo.ts`: `calculateShelfPrice` (redondea el precio final a 2 decimales antes del `ceil` para evitar saltos de escalón por coma flotante).
- `src/modules/production/domain/price-approval.entity.ts`: `suggested_price_net`, `tax_rate`, `price_basis`; dominio `priceBasis` ('tax_included' | 'legacy').
- `src/modules/production/infrastructure/price-approval.repository.ts`: `create` guarda los campos nuevos y `price_basis: 'tax_included'`.
- `src/modules/production/domain/cost-sheet.entity.ts`, `infrastructure/cost-sheet.repository.ts`: `suggested_price_net`, `tax_rate`.
- `src/modules/production/services/variant-price-repost.service.ts`: IVA del producto obligatorio; precio final con `calculateShelfPrice`.
- `src/modules/production/services/price-approval.service.ts`: `loadAll` (valida el lote antes de escribir en aprobar, rechazar y publicar) y `assertPublishable` (base con IVA, precio actual, IVA sin cambios, precio > 0).
- `tests/unit/price-tax.test.ts`: 14 pruebas.

No aplicado: `admin-cost-summary.service.ts` (opcional en 3.4). Pendientes detectados: `docs/modules.md`, puntos 77 y 78.

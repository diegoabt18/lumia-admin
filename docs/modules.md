# Módulos implementados (etapa 2)

| Módulo | Ruta UI | Lectura | Escritura disponible |
|---|---|---|---|
| Dashboard | `/dashboard` | `admin.access` | — |
| Analítica | `/analytics` (7 días, 30 días, 90 días, 12 meses) | `analytics.read` | — (solo lectura) |
| Categorías | `/categories` | `categories.read` | Crear (`categories.create`), renombrar o cambiar slug (`categories.update`), eliminar (`categories.delete`) |
| Productos | `/products`, `/products/:id` | `products.read` | Crear (`products.create`), editar datos generales (`products.update`), eliminar (`products.delete`); variantes: crear, editar y eliminar, y stock por variante (`products.update`) |
| Inventario | `/inventory` | `products.read` | Ajustar cantidad y "por pedido" (`products.update`) |
| Promociones | `/promotions`, `/promotions/new`, `/promotions/:id` | `products.read` | Crear, editar, pausar o activar, eliminar (`products.update`) |
| Banners | `/banners` | `products.read` | Crear, editar, eliminar (`products.update`) |
| Imágenes | `/images` (pestañas: producto, sitio, material) | `products.update` o `materials.update` | Generar variantes AVIF + WebP y descargarlas (archivo o ZIP). Producto y sitio: `products.update`; material: `materials.update` |
| Producción: precios | `/production/pricing`, `/production/pricing/:id` | `recipes.read` (+ `products.read` para el detalle) | Asignar receta al producto (`recipes.update`) y a variantes (`products.update`); enviar a aprobación (`costing.manage`) |
| Producción: aprobaciones | `/production/approvals` | `costing.read` | Aprobar, rechazar y publicar precio (`costing.manage`) |
| Producción: recetas | `/production/recipes`, `/production/recipes/new`, `/production/recipes/:id` | `recipes.read` | Crear (`recipes.create`; los materiales requieren `materials.read`), editar materiales, costos indirectos, margen y estado, y calcular costo (`recipes.update`), eliminar (`recipes.delete`) |
| Producción: materiales | `/production/materials`, `/production/materials/:id` | `materials.read` | Crear (`materials.create`), editar ficha, vincular proveedores y registrar precios (`materials.update`), eliminar (`materials.delete`) |
| Producción: proveedores | `/production/suppliers` | `suppliers.read` | Crear (`suppliers.create`), editar y desactivar (`suppliers.update`) |
| Producción: unidades | `/production/units` | `units.read` | Crear (`units.create`); editar nombre, orden y estado (`units.update`) |
| Configuración | `/store-settings` (pestañas: envíos, pagos, moneda, atención al cliente) | `admin.access` | Todo con `admin.access` (el Server no tiene permisos específicos) |
| Reseñas y preguntas | `/feedback` (reportes de clientes) | `admin.access` | Ocultar o volver a mostrar la reseña o pregunta reportada (`admin.access`) |
| Usuarios | `/users`, `/users/:id` | `admin.users.read` | Asignar y quitar roles (`admin.users.manage` + `admin.roles.read`), con las protecciones de los puntos 31 a 36 |
| Roles y permisos | `/roles`, `/roles/:id` | `admin.roles.read` | Crear, duplicar, editar nombre, descripción y permisos, archivar, restaurar y eliminar (`admin.roles.manage`), con las protecciones de los puntos 37 a 42 |
| Auditoría | `/audit-log` (pestañas: accesos, cambios de permisos) | `admin.audit.read` | — (solo lectura) |
| Pedidos | `/orders`, `/orders/:id` | `orders.read` | Cambiar estado, notas internas, resolver solicitudes de cancelación y anticipos: configurar, registrar anticipo y saldo (`orders.update`) |

Los botones de escritura solo aparecen con el permiso correspondiente. El Server vuelve a autorizar cada petición.

## Brechas del Server y cómo las protege Lumia Admin

Estas brechas son del Server. Lumia Admin **no las corrige**: las rodea con protecciones explícitas. Lo correcto es resolverlas en el Server (pendiente de aprobación).

| # | Brecha en el Server | Riesgo | Protección en Lumia Admin |
|---|---|---|---|
| 1 | Cambiar el `slug` de una categoría no actualiza `category_slug` en los productos (`CategoryRepository.updateCategory`) | Productos con una categoría inexistente | La UI solo permite cambiar el slug si la categoría tiene 0 productos |
| 2 | Eliminar una categoría no comprueba si tiene productos | Igual que el punto 1 | La UI solo permite eliminar categorías con 0 productos |
| 3 | Cambiar el `slug` de un producto no actualiza `product_slug` en variantes ni inventario | Variantes huérfanas | El BFF rechaza `slug` en el PATCH (esquema `strict`); el slug se muestra como no editable |
| 4 | Eliminar un producto no borra sus variantes ni su inventario | Variantes huérfanas que el POS sigue encontrando por SKU | El **BFF** rechaza (409) eliminar productos con variantes; la UI ofrece "Inactivo" |
| 5 | `PUT /admin/inventory/:sku` hace *upsert*: con un SKU inexistente crea un registro | Inventario fantasma | La UI solo usa SKUs del listado; desde el detalle de producto se usa `PUT /admin/products/:id/inventory/:sku`, que verifica la pertenencia |
| 6 | El stock se guarda como valor **absoluto** sin control de concurrencia | Una venta simultánea puede perderse al sobrescribir | Aviso en el diálogo; el valor actual se muestra al abrir. Solución real: ajustes relativos o versión optimista en el Server |
| 7 | Se puede poner la cantidad por debajo de lo reservado | Pedidos reservados sin unidades | La UI bloquea `cantidad < reservado` |
| 8 | `PATCH /admin/orders/:id` acepta cualquier cambio de estado sin validar el flujo. Cada cambio tiene efectos: `paid` descuenta stock, `cancelled` lo repone, `delivered` registra el ingreso contable | Saltos de estado incoherentes y efectos contables o de stock indebidos | El **BFF** vuelve a leer el pedido y solo permite: pendiente→pagado/cancelado, pagado→enviado/entregado/cancelado, enviado→entregado (`allowedTransitions` en `shared/schemas/orders.ts`). Los flujos con anticipo no pueden marcarse "pagado" |
| 9 | `PATCH /admin/orders/:id/cancellation` no comprueba que exista una solicitud abierta | Cancelar pedidos sin solicitud por esta vía | El BFF exige `cancellationRequestStatus` igual a `requested` o `info_needed` |
| 10 | Las búsquedas de categorías, productos y pedidos usan el texto como **expresión regular sin escapar** | Patrones costosos o búsquedas erróneas | El BFF escapa el texto (búsqueda literal) y lo limita a 120 caracteres |
| 11 | Los listados no filtran por estado (productos, pedidos) ni por categoría | — | Solo se ofrecen los filtros que el Server soporta: búsqueda y canal en pedidos |
| 12 | Eliminar una variante borra también su inventario sin mirar reservas | Pedidos en curso pierden sus unidades reservadas | El **BFF** rechaza (409) eliminar variantes con unidades reservadas |
| 13 | Ningún endpoint asigna `option_value_ids` a las variantes; la tienda elige variantes por el mapa `options` | Valores de opción con errores tipográficos | Si el producto tiene ejes definidos, el formulario ofrece selectores con esos valores; si no, pares libres (máx. 3) |
| 14 | `currency` de la variante la elige quien llama | Variantes en monedas mezcladas | El BFF fija la moneda de la tienda (`NUXT_PUBLIC_STORE_CURRENCY`) y rechaza `currency` en el cuerpo |
| 15 | Configurar un anticipo no comprueba el estado del pedido (permitiría hacerlo en pedidos cancelados, entregados o con pago en línea en curso) | Planes de pago incoherentes | El **BFF** solo permite configurarlo en pedidos `pending` sin pago (`depositStep` en `shared/schemas/orders.ts`) |
| 16 | Registrar el anticipo o el saldo no comprueba el estado del pedido ni el monto (`amount ≥ 0`) | Pagos registrados sobre pedidos cancelados o con montos absurdos | El **BFF** exige el paso correcto (anticipo y luego saldo) en pedidos `pending`, con monto > 0 y no mayor que el total; la UI avisa si difiere del esperado |

| 17 | `PATCH /admin/promotions/:id` y `PATCH /admin/store-banners/:id` **reemplazan el documento completo** | Al editar se perderían los campos que la interfaz no envía (imagen de notificación de la promoción, `collection_slug` del banner) | El BFF lee el documento actual y reenvía esos campos sin cambios |
| 18 | `cta_href` e `image_url` de banners y `banner_url` de promociones solo se validan como texto. La tienda acepta `//otro-sitio.com` como enlace (redirección abierta) y renderiza el enlace con `NuxtLink :to` | Enlaces a sitios externos o esquemas peligrosos publicados en la tienda | El BFF solo acepta imágenes `https://` y enlaces `https://` o rutas internas (`/…`, nunca `//`, `\`, `javascript:` ni `data:`). Ver `shared/schemas/links.ts` |
| 19 | Las promociones y banners no tienen permiso propio (usan `products.read` y `products.update`) | Quien edita productos también publica promociones | Documentado en `docs/permissions.md`; requiere permisos nuevos en el Server |

| 20 | `PUT store-shipping-settings`, `PATCH store-currency-settings` y `PATCH store-customer-settings` **no validan el cuerpo**: guardan cualquier objeto (`$set` de claves arbitrarias) | Configuración corrupta que rompe el cálculo de envío o la tienda; inyección de campos | El BFF valida con esquemas **estrictos** (`shared/schemas/settings.ts`): solo las claves conocidas, con tipos, rangos y longitudes acotados y URLs seguras |
| 21 | Cambiar `code` de la moneda no convierte los precios almacenados | Precios en COP mostrados como otra moneda | El código de moneda es de solo lectura en Lumia Admin |
| 22 | `calculationType` admite cualquier texto, pero solo `flat_rate` está implementado en el Server y en la tienda | Envío roto con un valor desconocido | El BFF fija `flat_rate` |
| 23 | La activación de Mercado Pago se guarda junto con los demás métodos | Activar o desactivar pagos en línea por error | Mercado Pago se muestra bloqueado y el BFF reenvía su estado y textos actuales, ignorando lo que llegue del navegador |
| 24 | `GET store-shipping-settings` y `GET store-currency-settings` **escriben** los valores por defecto en la base si no existen | Una lectura modifica datos | Solo documentado (comportamiento del Server) |
| 25 | Toda la configuración solo exige `admin.access` | Cualquier usuario del panel cambia pagos y envíos | Documentado; requiere permisos específicos en el Server |

| 26 | `GET /admin/feedback/reports` solo devuelve tipo, id del elemento, id de quien reporta y motivo: ni el texto ni el producto. No hay endpoint de administración para leer reseñas o preguntas por id (la lectura pública exige el slug del producto) | Se modera sin ver el contenido | La confirmación lo advierte; ocultar es reversible ("Mostrar"). Solución real: incluir el contenido y el producto en el reporte |
| 27 | Los reportes no se pueden resolver: `status` siempre es `pending` y no hay endpoint para cambiarlo | La lista crece sin distinguir lo atendido | La UI no muestra el estado (sería engañoso) y marca solo lo que se hizo en la sesión actual del navegador |
| 28 | No existe moderación de **respuestas** (`entity_type: answer`) | Respuestas reportadas no se pueden retirar | La UI lo indica en la fila; ocultar la pregunta oculta también sus respuestas |
| 29 | `featured` (reseñas) y `answered` (preguntas) se guardan, pero nada los lee | Cambiarlos no tiene efecto | No se exponen; el BFF solo acepta `{hidden}` (esquema estricto) |
| 30 | `entity_id` del reporte lo envía el cliente (texto libre hasta 64 caracteres) | Identificadores arbitrarios en la ruta | Solo se ofrecen acciones con ObjectId válido, y el BFF vuelve a validar el id |
| 31 | Hay tres APIs de usuarios distintas: `/admin/users*` y `/admin/staff-users*` calculan los permisos **solo con el rol base** (ignoran los roles RBAC, que son los que el Server aplica), y `/admin/staff-users/:id/roles` cambia el rol base, no los roles RBAC | Ver o editar permisos que no son los reales | Solo se usa `/admin/security/users*`, que usa `AuthorizationService` (lo mismo que aplica el Server). No se expone el cambio de rol base |
| 32 | Asignar o quitar roles no tiene control de escalada: quien tenga `admin.users.manage` puede asignar cualquier rol, incluido uno con más permisos que los suyos, y también modificarse a sí mismo | Escalada de privilegios | El **BFF** bloquea cambiar los propios roles (403 `SELF_ROLE_CHANGE`) y simula el cálculo del Server (unión de `allow` de los roles activos menos la unión de `deny`): si el usuario ganaría algún permiso que quien hace el cambio no tiene, responde 403 `PRIVILEGE_ESCALATION`. Quitar un rol con denegaciones se comprueba igual. Función pura `evaluateRoleChange` en `server/utils/users.ts` |
| 33 | Sin roles activos, el Server vuelve al rol base (`role`); con `admin` eso son **todos** los permisos | Quitar el último rol puede dar más permisos, no menos | El BFF bloquea (409 `FALLBACK_TO_LEGACY_ROLE`) cualquier cambio que deje sin roles activos a un usuario cuyo rol base no es `user` |
| 34 | Asignar o quitar roles no invalida la caché de permisos (5 minutos) ni cambia `permissionsVersion` | El cambio tarda hasta 5 minutos en aplicarse, también al quitar permisos. El detalle puede mostrar permisos efectivos desactualizados durante ese tiempo | Avisado en la pantalla, en la confirmación y en el mensaje de éxito. Solución real: `invalidateUserCache` en `assignRole` y `removeRole` |
| 35 | Se pueden asignar roles a cuentas de cliente (`isStaff` no interviene en la autorización) y a roles archivados (sin efecto) | Clientes con acceso al panel por error | La confirmación usa estilo de peligro y lo advierte para clientes; el BFF rechaza roles archivados (409) |
| 36 | Las protecciones del BFF son comprobaciones previas, no atómicas | Un cambio simultáneo entre la comprobación y la escritura no se detecta | Riesgo aceptado; la protección real debe estar en el Server |
| 37 | Crear, editar, duplicar o restaurar roles no tiene control de escalada: quien tenga `admin.roles.manage` puede dar a un rol (y a todos sus usuarios, incluido él mismo) cualquier permiso | Escalada de privilegios | El **BFF** exige que todo permiso nuevo esté entre los de quien hace el cambio (`findEscalation` en `server/utils/roles.ts`); en el detalle, la UI deshabilita los permisos que no tienes. Restaurar y duplicar se comprueban con los permisos efectivos del rol |
| 38 | `roleCreateSchema` y `rolePatchSchema` aceptan `denyKeys` e `inheritRoleIds`, pero el servicio los ignora | Parece que se guardan y no se guardan | No se ofrecen: el BFF los rechaza (esquema estricto) y el detalle los muestra como solo lectura |
| 39 | Archivar o eliminar un rol no toca sus asignaciones: el Server lo ignora y, a quien solo tuviera ese rol, le aplica el rol base (`admin` = todos los permisos). Los roles que heredan de él pierden permisos. Eliminar deja asignaciones huérfanas | Escalada o pérdida de permisos inesperadas | El **BFF** solo archiva o elimina roles sin usuarios asignados y sin roles que hereden de él. Los roles archivados no se pueden eliminar (el Server no informa sus asignaciones) |
| 40 | El listado de roles excluye los archivados; solo `/roles/export` los devuelve | — | El BFF combina `/roles` (conteos de usuarios) y `/roles/export` (archivados) |
| 41 | Editar un rol no comprueba la versión (`version` se incrementa, pero no se valida) | Una edición simultánea sobrescribe la otra | El BFF recibe la `version` leída y rechaza (409) si cambió |
| 42 | Editar los permisos de un rol no invalida la caché de permisos de sus usuarios | Tarda hasta 5 minutos en aplicarse | Avisado en el detalle y en la confirmación |
| 43 | El registro de cambios de permisos (`permission_audit`) solo lo escriben los permisos temporales y la importación de roles. Asignar o quitar roles, editar, archivar o eliminar roles, y cualquier cambio de pedidos, productos, promociones o configuración **no quedan registrados** en ninguna parte | No hay trazabilidad de quién cambió qué | Aviso en la pantalla de auditoría. Requiere que el Server registre cada escritura administrativa |
| 44 | `GET /admin/audit-log` ignora el filtro `event` cuando hay búsqueda | Resultados distintos a los filtros mostrados | El BFF no envía `event` si hay búsqueda y la UI deshabilita los filtros de evento mientras se busca |
| 45 | Un intento fallido con un email inexistente guarda el texto escrito en el campo email | Si alguien escribe la contraseña en ese campo, queda en el registro | Solo documentado |
| 46 | El ticket promedio (`aov`) del Server divide los ingresos de pedidos vendidos entre **todos** los pedidos, incluidos pendientes y cancelados | Ticket promedio subestimado | El BFF lo recalcula: ventas ÷ pedidos pagados, enviados o entregados (con `/analytics/sales`). No hay dato equivalente del periodo anterior, así que no se muestra su variación |
| 47 | La variación (`growth`) vale 100 % cuando el periodo anterior es 0 | Crecimientos ficticios | El BFF devuelve `null` y la UI muestra "Sin datos del periodo anterior" |
| 48 | Las ventas por día se agrupan por fecha **UTC** | Pedidos de la noche (después de las 7:00 p. m. en Colombia) caen en el día siguiente | Indicado en la tabla del gráfico y en "Cómo se calcula". Solución real: agrupar con la zona de la tienda en el Server |
| 49 | `revenue.byPaymentMethod` cuenta pedidos, no montos, y mezcla todos los estados. `newCustomers` cuenta todas las cuentas creadas, también personal. Las ventas no descuentan reembolsos | Lecturas equivocadas de las cifras | Etiquetas explícitas ("Pedidos por método de pago", "Cuentas nuevas") y nota de reembolsos |
| 50 | `findManyInRange` carga en memoria todos los pedidos del periodo y del anterior, sin límite (12 meses = 2 años de pedidos por consulta, dos veces) | Consultas lentas o consumo de memoria del Server al crecer | Solo documentado. Solución real: agregaciones en MongoDB |
| 51 | La generación de imágenes no guarda nada: devuelve las variantes en base64 dentro del JSON y hay que subirlas a mano al repositorio de imágenes. Tampoco asigna la imagen al producto | Pasos manuales; una respuesta de producto con galería completa puede pesar decenas de MB | La UI lo avisa, muestra la ruta de cada archivo (`exportPath`) y descarga un ZIP con esa estructura. Solución real: que el Server publique en el almacenamiento o CDN |
| 52 | El Server procesa las imágenes en la misma petición (sharp con concurrencia 1): hasta 90 codificaciones AVIF por envío | Peticiones de minutos que ocupan el Server | El BFF usa un timeout propio de 180 s solo para estas rutas; la UI indica que puede tardar |
| 53 | El multipart solo se acepta en las tres rutas de imágenes | Superficie extra de subida de archivos | El guard exige Origin, `Content-Length` (sin chunked, 411) y ≤ 40 MB (413); el BFF exige sesión antes de leer el cuerpo, solo acepta los campos y archivos esperados, valida tipo real por bytes (nunca SVG), ≤ 12 MB por archivo y la configuración con el esquema del estudio, y reconstruye el multipart. La respuesta se valida y `exportPath` no admite `..` ni rutas absolutas |
| 54 | `PATCH` de materiales permite cambiar la unidad de compra sin convertir `lastCost` (que es $ por unidad de compra) y no marca las recetas como desactualizadas | Costos de receta incorrectos sin aviso | El BFF bloquea (409) cambiar la unidad de compra si el material tiene costo o historial de precios. El contenido por unidad sí se puede editar (solo documentado: no se recalculan recetas) |
| 55 | Registrar un precio acepta cualquier unidad y cualquier `supplierId` (aunque no exista) | El costo vigente queda en otra unidad; historial con proveedores inexistentes | El BFF fija la unidad a la de compra del material, exige metros si es `rollo` y solo acepta proveedores vinculados al material (toma su nombre del vínculo) |
| 56 | El nombre de material solo se valida como único al crear y con coincidencia exacta | Duplicados por mayúsculas o al renombrar | El BFF comprueba sin distinguir mayúsculas al crear y al renombrar |
| 57 | Eliminar un proveedor no comprueba ni borra sus vínculos con materiales, y no hay forma de consultar cuántos tiene | Vínculos huérfanos ("Proveedor eliminado") | No se ofrece eliminar: se desactiva. Los inactivos no se pueden vincular (409) |
| 58 | Un material puede tener varios proveedores preferidos | Ambigüedad al elegir proveedor | Al marcar uno como preferido, el BFF desmarca los demás |
| 59 | Cambiar abreviatura, familia o factor de una unidad (o eliminarla) altera las conversiones de costo; el Server no recalcula ni invalida su caché de conversiones | Costos de receta incorrectos | Solo se ofrece crear unidades y editar nombre, orden y estado. El esquema rechaza los demás campos |
| 60 | El Server elimina `null` del cuerpo antes de validar: los números opcionales (contenido, stock) no se pueden vaciar una vez guardados | Valores que no se pueden quitar | Documentado; los textos se vacían enviando '' |
| 61 | El stock de materiales se guarda como valor absoluto, sin movimientos ni control de concurrencia | Pérdida de cambios simultáneos | Aviso en el formulario |
| 62 | El costo de receta solo suma materiales e indirectos. Mano de obra, empaque, costos de producción y servicios (`/recipes/:id/labor-cost` y similares) se guardan, pero ningún cálculo los usa | Costos subestimados; formularios que no influyen en nada | No se exponen esas secciones; el panel de costo lo aclara. Requiere integrarlas en `CostingService` |
| 63 | `pricingMode`, `manualPrice`, `actualPrice` y la marca `optional` de los costos indirectos se guardan pero nada los usa | Ajustes sin efecto | No se exponen; el BFF los rechaza (esquema estricto) |
| 64 | Las líneas aceptan materiales en texto libre (sin `materialId`) o inexistentes, que se costean en $0 sin aviso | Recetas más baratas de lo real | El BFF exige `materialId` y comprueba que todos existan (`GET materials?ids=`). El buscador avisa los materiales sin costo |
| 65 | `productSlug` no se valida contra el catálogo, y al cambiarlo `productName` queda desactualizado (el esquema de edición no lo admite) | Recetas que apuntan a productos inexistentes o con nombre viejo | El BFF exige que el producto exista. El nombre viejo se documenta; la UI muestra también el slug |
| 66 | Guardar líneas deja los costos por línea en 0 y el total desactualizado hasta calcular | Costos en 0 en listados | El BFF calcula el costo justo después de crear o guardar. Si el Server lo rechaza (unidades incompatibles, contenido sin configurar), la receta queda guardada y se muestra su mensaje |
| 67 | Eliminar una receta no comprueba si productos o variantes la tienen asignada | Productos apuntando a una receta inexistente | El BFF rechaza (409) si tiene asignaciones |
| 68 | Editar no comprueba la versión | Una edición simultánea sobrescribe la otra | El BFF compara la `version` leída y rechaza (409) si cambió |
| 69 | El "margen" es un recargo sobre el costo (costo × (1 + margen/100)), sin impuestos | Confusión con margen sobre precio | Etiqueta y ayuda explícitas |
| 70 | ~~El precio sugerido no incluía IVA y se publicaba como precio con IVA~~ **Resuelto en el Server** (propuesta `docs/proposals/server-iva-precio-sugerido.md`, aplicada el 2026-11-08): el envío a aprobación calcula el precio final con el IVA del producto (`priceBasis: 'tax_included'`) y exige el IVA configurado; el Server no publica solicitudes de la regla anterior | Solicitudes anteriores (`legacy`) sin publicar | La UI muestra precio con IVA, base sin IVA y recargo real; las `legacy` se marcan y no se pueden publicar (409 `LEGACY_PRICE_BASIS`) |
| 71 | ~~Publicar no comprobaba el precio actual~~ **Resuelto en el Server**: publicar exige que el precio de la variante y el IVA del producto sigan siendo los de la solicitud | — | El BFF repite las comprobaciones (409 `PRICE_CHANGED`, `TAX_RATE_CHANGED`) como defensa adicional |
| 72 | ~~`approve`, `reject` y `publish` dejaban lotes a medias~~ **Resuelto en el Server**: validan todas las solicitudes antes de escribir | — | El BFF sigue enviando una solicitud por llamada |
| 73 | No hay separación de funciones: quien envía a aprobación puede aprobar y publicar | Sin control de cuatro ojos | Aviso "Creada por ti" (no se bloquea: no hay permiso específico para hacerlo) |
| 74 | Asignar recetas acepta recetas inactivas; asignar a variantes exige `products.update`, a productos `recipes.update` | Costeo con recetas fuera de uso | El BFF solo asigna recetas activas (409) y comprueba que la variante pertenezca al producto |
| 75 | No hay GET de una solicitud por id; las aprobadas no se pueden rechazar | — | El BFF busca la solicitud en el listado de su estado; la UI indica que una aprobada que ya no aplica se reemplaza con un nuevo envío |
| 76 | El detalle de producto devuelve `productionRecipeId` solo si está guardado como texto | Una receta asignada de otra forma aparecería como "sin receta" | Solo documentado |
| 77 | Las solicitudes **aprobadas** no se pueden rechazar, así que las aprobadas con la regla anterior quedan en "Aprobadas" sin poder publicarse | Lista con solicitudes muertas | Reenviar el producto crea una nueva. Propuesta pendiente: permitir rechazar aprobadas en el Server |
| 78 | Cambiar el IVA de un producto no marca sus variantes como "por enviar" (el estado solo mira la versión de la receta) | El precio publicado queda con el IVA anterior hasta un nuevo envío | El Server bloquea publicar si el IVA cambió (409); reenviar el producto recalcula |
| 79 | ~~`GET /admin/audit-log` respondía 500 si algún registro no tenía `createdAt`~~ **Resuelto en el Server** (2026-11-08, sin commit): Lumia en modo `embedded` escribe en `auth_audit_log` con la fecha en `timestamp`. El repositorio usa `createdAt` o, si falta, `timestamp`; el filtro por fechas y el orden incluyen esos registros; `security-enterprise` (listado y panel) tolera la fecha ausente. Prueba: `tests/unit/auth-audit.test.ts` | — | Los registros sin fecha se muestran con "—" |

Reseñas y preguntas: el Server no expone un listado de administración de reseñas o preguntas; el módulo trabaja solo sobre los reportes. El estado oculto actual de un elemento no se puede consultar.

Atención al cliente (WhatsApp, correo, FAQ, políticas): el Server los publica en `GET /api/store/customer-settings`, pero Lumia 2.0 todavía no los usa.

Las fechas de vigencia se editan en la **hora de la tienda** (`NUXT_PUBLIC_STORE_TIMEZONE`, por defecto America/Bogota) y se envían al Server en UTC (`shared/utils/datetime.ts`).

## Fuera de alcance por ahora

- Auditoría: estadísticas (`/permission-audit/stats`), detalle con `before`/`after` (objetos libres que el BFF no reenvía) y sesiones activas.
- Roles: herencia y permisos denegados (el Server los ignora al guardar), importar y exportar, validar herencia y edición del catálogo de permisos (`/admin/security/permissions`).
- Usuarios: cambio del rol base, alta de personal (`isStaff`), permisos temporales, excepciones por usuario, delegaciones, 2FA de otros usuarios y cierre de sesiones. Datos personales del cliente (direcciones, pedidos) no se muestran.

- Producción: envío y recálculo masivos (`repost-all`, `recalculate-all`), impacto de costos, equivalencias, costos indirectos globales, configuración de producción, tablero y auditoría de producción. Mano de obra, empaque, costos de producción y servicios (no intervienen en el cálculo). Eliminar proveedores y unidades.
- Imágenes: publicar en el CDN y asignar la imagen al producto (el Server no lo ofrece). Imágenes de categorías, banners, promociones y avatares no tienen generador en el Server.
- Promociones: editar la imagen de notificación (se conserva la existente). Banners: editar `collection_slug` (se conserva). Subir imágenes: por ahora se indica una URL https.
- Edición de los **ejes** de opciones (`PUT /admin/products/:id/options`). Reemplaza el catálogo completo de ejes del producto y requiere su propio diseño.
- Imagen de la variante (`image_path`), imágenes de producto, receta y costeo.
- Pedidos: cambio directo de `paymentStatus` y factura HTML (`/invoice`). Mostrar ese HTML en el origen del admin requiere revisar el escape de la plantilla del Server.
- El selector de categorías carga hasta 100 y avisa si hay más.

## Lumi (asistente, fase 1)

| Elemento | Detalle |
|---|---|
| Permiso | `lumi.use` (mismo nombre en el Server). El icono solo aparece con ese permiso |
| BFF | `/api/admin/lumi/chat` (POST), `/api/admin/lumi/conversations` (GET), `/api/admin/lumi/conversations/:id` (GET, DELETE) |
| Server | `/admin/lumi/*`, autorizado con `admin.access` + `lumi.use`. Reenvía a ia-asistente con el identificador del usuario |
| Streaming | `/api/admin/lumi/chat/stream` (SSE). El BFF reenvía el stream del Server. Detener cancela la generación; el turno detenido no se guarda en el historial |
| Límites | Sin búsqueda web. Sin acceso a datos de la tienda todavía |
| Renderizado | Texto plano (sin HTML ni Markdown). Las respuestas del modelo nunca se insertan como HTML |
| Posición del icono | Solo en el navegador (localStorage, clave `lumia-admin:lumi-position:v1`); sin datos personales |

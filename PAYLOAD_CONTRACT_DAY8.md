# DAY 8 — FINAL PAYLOAD DEFINITION (ELORIA STUDIO)

Este documento define el **JSON canónico y congelado** que conecta:
Editor → Backend → n8n.

No incluye OAuth ni llamadas API. Es solo el contrato de datos.

---

## 1) Payload canónico (JSON)

```json
{
  "post_id": null,
  "status": "draft",
  "publish_mode": "now",
  "scheduled_at_utc": null,
  "post_master": {
    "text": "",
    "media": []
  },
  "selected_networks": [],
  "formats": {
    "instagram": { "feed": true, "stories": false },
    "facebook": { "feed": true, "stories": false },
    "tiktok": { "feed": true, "stories": false },
    "youtube": { "feed": true },
    "twitter": { "feed": true },
    "linkedin": { "feed": true }
  },
  "adaptations": {
    "instagram": {
      "text": "",
      "hashtags": "",
      "title": "",
      "user_modified": false,
      "ui_badge_visible": false
    }
  },
  "validation": {
    "global": [],
    "per_network": {}
  },
  "metadata": {
    "created_at_utc": null,
    "updated_at_utc": null,
    "editor_version": "day7",
    "source": "editor"
  }
}
```

---

## 2) Campos requeridos vs opcionales

**Requeridos**
- `status`
- `publish_mode`
- `post_master`
- `selected_networks`
- `formats`
- `adaptations`
- `validation`
- `metadata`

**Opcionales**
- `post_id` (null hasta persistencia)
- `scheduled_at_utc` (null cuando `publish_mode = "now"`)
- `metadata.created_at_utc`, `metadata.updated_at_utc` (null hasta backend)
- `adaptations[network].title` (solo requerido por reglas YouTube)

---

## 3) Valores por defecto

- `status`: `"draft"`
- `publish_mode`: `"now"`
- `scheduled_at_utc`: `null`
- `post_master.text`: `""`
- `post_master.media`: `[]`
- `selected_networks`: `[]`
- `formats`: Feed true por defecto; Stories false cuando aplica
- `adaptations`: vacío hasta seleccionar red
- `validation.global`: `[]`
- `validation.per_network`: `{}`
- `metadata.editor_version`: `"day7"`
- `metadata.source`: `"editor"`

---

## 4) Enums permitidos

**Networks**
- `instagram`
- `facebook`
- `tiktok`
- `youtube`
- `twitter`
- `linkedin`

**Formats**
- `feed`
- `stories`

**Status**
- `draft`
- `scheduled`

**Publish mode**
- `now`
- `scheduled`

**Validation severity**
- `error`
- `warning`

---

## 5) Reglas del contrato (no lógica de UI)

- `selected_networks` debe ser el origen de verdad para qué redes se publican.
- `formats[network]` debe existir para **todas** las redes soportadas (incluso si no están seleccionadas).
- `adaptations[network]` solo existe si la red está seleccionada.
- `scheduled_at_utc` se define solo si `publish_mode = "scheduled"`.
- `validation` debe reflejar el último estado de validación del editor.

---

## 6) Compatibilidad futura

Se permite añadir sin romper el contrato:
- Nuevas redes (agregar keys nuevas en `formats` y `adaptations`).
- Nuevos formatos (por red).
- Campos extra en `metadata`.
- Campos extra en `validation` (por ejemplo `warnings`).

No se permite cambiar nombres existentes ni tipos.

---

## 7) Preparado para backend + n8n

Este payload está listo para:
- Persistir en backend (DB/API).
- Enviar a n8n como payload único.
- Mantener consistencia entre editor y ejecución.

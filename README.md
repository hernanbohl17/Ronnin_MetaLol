# PoolKR · Mi pool de campeones con datos del meta coreano

Página estática (GitHub Pages) que muestra winrate, pickrate, builds, runas,
combos y counters de mi pool de campeones, con datos del servidor de **Corea**
actualizados automáticamente cada día vía **GitHub Actions**.

## Estructura del repositorio

```
lol-meta-tracker/
├── index.html                     # SPA con hash routing (#/, #/lane/JG, #/champ/LeeSin)
├── css/
│   └── style.css                  # Tema oscuro "Hextech" (azul abisal + oro Riot)
├── js/
│   └── app.js                     # Pie chart (Chart.js), routing y render desde data.json
├── data/
│   └── data.json                  # Generado por el script — el frontend lo lee con fetch()
├── scripts/
│   └── update_data.py             # Obtiene stats KR + catálogos de Data Dragon
├── requirements.txt
├── .github/
│   └── workflows/
│       └── update_data.yml        # Cron diario + commit/push automático
└── README.md
```

## Despliegue en GitHub Pages

1. Crea un repositorio y sube todo el contenido de esta carpeta.
2. En **Settings → Pages**, selecciona *Deploy from a branch*, rama `main`,
   carpeta `/ (root)`.
3. En **Settings → Actions → General → Workflow permissions**, marca
   **"Read and write permissions"** (necesario para que el bot haga push
   del `data.json`).
4. Ve a la pestaña **Actions** y ejecuta manualmente el workflow
   *"Actualizar datos del meta coreano"* (`workflow_dispatch`) para generar
   la primera versión real del `data.json`.

La web quedará en `https://<tu-usuario>.github.io/<repo>/`.

## Cómo funciona la actualización

- El workflow corre todos los días a las **06:00 UTC** (`cron: "0 6 * * *"`).
- `update_data.py`:
  1. Descarga de **Data Dragon** (CDN oficial de Riot) la versión del parche,
     nombres de campeones y catálogos de runas/ítems en español.
  2. Consulta por cada campeón el endpoint JSON de **Lolalytics** filtrado por
     `region=kr` (winrate, pickrate, banrate, runas e ítems más ganadores).
  3. Fusiona esos datos con la base curada del script (combos, tips de
     matchups, builds alternativas vs rivales ofensivos/defensivos) y escribe
     `data/data.json`.
- Si Lolalytics falla o cambia el esquema, el script **conserva las
  estadísticas de la ejecución anterior** en vez de romper la web.
- El paso final del workflow hace `git commit + push` solo si el JSON cambió;
  GitHub Pages redeploya solo.

## Probar en local

```bash
pip install -r requirements.txt

# Datos de ejemplo sin red:
python scripts/update_data.py --sample

# Actualización real:
python scripts/update_data.py

# Servidor local (fetch() no funciona con file://):
python -m http.server 8000
# → http://localhost:8000
```

## Notas y avisos

- **Lolalytics no tiene API pública documentada**: el endpoint
  `ax.lolalytics.com` es el que usa su propio frontend y puede cambiar sin
  aviso. El script hace ~14 peticiones al día con pausas de 1,5 s, pero revisa
  sus términos de uso. Alternativas más "oficiales": la API de pago de OP.GG o
  una API key de producción de Riot para calcular tus propias estadísticas.
- Las **imágenes** (splash arts, loading screens, iconos de ítems y runas) se
  sirven desde Data Dragon, el CDN oficial y gratuito de Riot.
- Los datos incluidos en el repo (`stats_source: "sample"`) son de ejemplo
  hasta la primera ejecución real del workflow.
- Proyecto personal no afiliado a Riot Games.

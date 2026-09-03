# Fauna · REWIND — video promo 15 s

Video vertical (1080x1920, 30 fps) para la fiesta retro 80/90 "REWIND" en Fauna.
Se genera por código para que cada elemento sea propio de la gráfica del evento:
cassette "Side A / RW-026" rebobinando, bola de espejos 3D, papel "Guest Check",
logotipo REWIND con extrusión y aberración cromática, ticket naranja y cierre con el logo de Fauna.

## Archivos
- `index.html`: la animación. `window.seek(t)` dibuja el cuadro exacto en el segundo `t`.
- `render.js`: captura los 450 cuadros con Playwright y los manda a ffmpeg junto con el audio.
- `audio.py`: sintetiza la pista (rebobinado de cinta + beat synthwave 118 BPM) en `audio.wav`.
- `FAUNA_REWIND_15s.mp4`: render final (versión web).

## Regenerar
```bash
python3 audio.py
FFMPEG=$(python3 -c "import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())") node render.js video FAUNA_REWIND_15s.mp4
node render.js stills "1.5,4.5,8,11.8,13.7"   # cuadros de prueba en stills/
```
Requiere `playwright` (Chromium), `numpy` e `imageio-ffmpeg`.

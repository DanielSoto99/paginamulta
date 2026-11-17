# RevisaTAG - Paso 1: credenciales y Git

Este paquete omite `.env`, `.git/`, `node_modules/` y archivos de compilación. Conservar el archivo `.env` existente en tu equipo no lo vuelve seguro si ya fue publicado en Git.

## Acciones en tus cuentas

1. Resend > API Keys: revoca la clave antigua incluida en el ZIP original y crea una nueva con permiso **Sending access**. No copies la clave en chats ni repositorios.
2. Netlify > Project configuration > Environment variables: actualiza `RESEND_API_KEY` con la nueva clave; scope **Functions** (o All); contexto Production si aplica. Despliega de nuevo para utilizarla.
3. Actualiza solo el `.env` local con la nueva clave si necesitas ejecutar Netlify CLI localmente. Mantén `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` únicamente como valores públicos. Revisa sus permisos de Supabase después.

## Cambios del paquete

- `.gitignore`: ignora `.env` y `.env.*`, permite `.env.example`, y excluye claves/certificados privados.
- `.env.example`: plantilla sin credenciales.
- Código de aplicación sin alteraciones funcionales en este primer paso.

## Aplicar a tu repositorio original

Copia `.gitignore` y `.env.example` a la carpeta raíz de TU repositorio existente. En PowerShell, desde esa carpeta:

```powershell
git rm --cached -- .env
git add .gitignore .env.example
git commit -m "Seguridad: dejar de versionar .env"
git ls-files -- .env
```

La última orden **no debe mostrar nada**. `git rm --cached` conserva tu archivo `.env` en el disco. Comprueba primero que el contenido de `.env.example` solo tiene marcadores, nunca secretos.

## IMPORTANTE: historial existente

Este commit impide exposiciones futuras del `.env`, pero **NO elimina las credenciales de commits anteriores**. Como el ZIP original contiene `.git/` con `.env` registrado, trata la antigua clave de Resend como expuesta y revócala. La limpieza de historia puede abordarse después de la rotación mediante `git-filter-repo`, respaldo y coordinación con otros clones; no uses `git push --force` sin verificar primero el repositorio.

## Validación de cierre

- Clave anterior de Resend revocada.
- Clave nueva de Resend configurada en Netlify, en el ámbito de Functions.
- `git ls-files -- .env` no devuelve nada.
- `.env` queda fuera de futuros commits.
- Enviar un correo de prueba **solo después** de revisar la siguiente fase de seguridad de PDFs y endpoint.

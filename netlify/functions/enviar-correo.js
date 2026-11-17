
/* global process */

import { Resend } from "resend";

// ==================== RESPUESTAS JSON ====================

function responder(statusCode, message) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message }),
  };
}

// ==================== SEGURIDAD Y VALIDACIONES ====================

// Evita interpretar los datos ingresados como código HTML.
function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Verifica que los enlaces utilicen HTTPS.
function esUrlHttps(valor) {
  try {
    return new URL(valor).protocol === "https:";
  } catch {
    return false;
  }
}

// ==================== FUNCIÓN PRINCIPAL ====================

export async function handler(event) {

  // 1. Permitir solamente POST.
  if (event.httpMethod !== "POST") {
    return responder(405, "Método no permitido.");
  }

  // 2. Verificar la clave privada de Resend.
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error("Falta RESEND_API_KEY en Netlify.");
    return responder(500, "El servicio de correo no está configurado.");
  }

  // 3. Leer los datos recibidos.
  let solicitud;

  try {
    solicitud = JSON.parse(event.body || "{}");
  } catch {
    return responder(400, "Los datos enviados no son un JSON válido.");
  }

  const campos = [
    "nombre",
    "rut",
    "email",
    "telefono",
    "patente",
    "mensaje",
    "urlAnotaciones",
    "urlMultas",
  ];

  // 4. Validar campos obligatorios.
  if (
    !solicitud ||
    typeof solicitud !== "object" ||
    campos.some(
      (campo) =>
        typeof solicitud[campo] !== "string" ||
        !solicitud[campo].trim()
    )
  ) {
    return responder(400, "Faltan datos obligatorios de la solicitud.");
  }

  const {
    nombre,
    rut,
    email,
    telefono,
    patente,
    mensaje,
    urlAnotaciones,
    urlMultas,
  } = Object.fromEntries(
    campos.map((campo) => [campo, solicitud[campo].trim()])
  );

  // 5. Validar correo electrónico.
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return responder(400, "El correo electrónico no es válido.");
  }

  // 6. Limitar tamaño de los campos de texto.
  if (
    nombre.length > 150 ||
    rut.length > 30 ||
    telefono.length > 40 ||
    patente.length > 20 ||
    mensaje.length > 5000
  ) {
    return responder(400, "Uno o más campos superan el largo permitido.");
  }

  // 7. Validar formato HTTPS de los enlaces.
  if (!esUrlHttps(urlAnotaciones) || !esUrlHttps(urlMultas)) {
    return responder(400, "Los enlaces de los documentos no son válidos.");
  }

  // ==================== CONTENIDO DEL CORREO ====================

  const html = `
    <h2>Nueva solicitud de revisión TAG</h2>

    <p><strong>Nombre:</strong> ${escaparHtml(nombre)}</p>
    <p><strong>RUT:</strong> ${escaparHtml(rut)}</p>
    <p><strong>Email:</strong> ${escaparHtml(email)}</p>
    <p><strong>Teléfono:</strong> ${escaparHtml(telefono)}</p>
    <p><strong>Patente:</strong> ${escaparHtml(patente)}</p>

    <hr />

    <p><strong>Mensaje:</strong></p>
    <p>${escaparHtml(mensaje).replace(/\r?\n/g, "<br />")}</p>

    <hr />

    <h3>Documentos PDF</h3>

    <p>
      <strong>Anotaciones vigentes:</strong><br />
      <a href="${escaparHtml(urlAnotaciones)}"
         target="_blank"
         rel="noopener noreferrer">
        Abrir PDF de anotaciones vigentes
      </a>
    </p>

    <p>
      <strong>Multas TAG vigentes:</strong><br />
      <a href="${escaparHtml(urlMultas)}"
         target="_blank"
         rel="noopener noreferrer">
        Abrir PDF de multas TAG vigentes
      </a>
    </p>
  `;

  // ==================== ENVÍO CON RESEND ====================

  try {
    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: "RevisaTAG <onboarding@resend.dev>",
      to: ["prescribetusmultas@gmail.com"],
      subject: `Nueva solicitud TAG - ${patente}`,
      replyTo: email,
      html,
    });

    // 8. Comprobar errores devueltos por Resend.
    if (error) {
      console.error("Resend rechazó el envío:", error);

      return responder(
        502,
        "No se pudo enviar el correo de solicitud."
      );
    }

    // 9. Confirmar que Resend devolvió un identificador.
    if (!data?.id) {
      console.error("Resend no devolvió un ID de correo.");

      return responder(
        502,
        "No se pudo confirmar el envío del correo."
      );
    }

    // 10. Confirmar aceptación sin registrar datos personales.
    console.log("Correo aceptado por Resend. ID:", data.id);

    return responder(
      200,
      "Correo aceptado para envío correctamente."
    );

  } catch (error) {
    console.error("Error al comunicarse con Resend:", error);

    return responder(
      502,
      "Ocurrió un problema al enviar el correo."
    );
  }
}

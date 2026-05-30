/* global process */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Método no permitido" }),
    };
  }

  try {
    const {
      nombre,
      rut,
      email,
      telefono,
      patente,
      mensaje,
      urlAnotaciones,
      urlMultas,
    } = JSON.parse(event.body);

    await resend.emails.send({
      from: "RevisaTAG <onboarding@resend.dev>",
      to: ["prescribetusmultas@gmail.com"],
      subject: `Nueva solicitud TAG - ${patente}`,
      html: `
        <h2>Nueva solicitud de revisión TAG</h2>

        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>RUT:</strong> ${rut}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Patente:</strong> ${patente}</p>

        <hr />

        <p><strong>Mensaje:</strong></p>
        <p>${mensaje}</p>

        <hr />

        <h3>Documentos PDF</h3>

        <p>
          <strong>Anotaciones vigentes:</strong><br />
          <a href="${urlAnotaciones}" target="_blank" rel="noopener noreferrer">
            Abrir PDF de anotaciones vigentes
          </a>
        </p>

        <p>
          <strong>Multas TAG vigentes:</strong><br />
          <a href="${urlMultas}" target="_blank" rel="noopener noreferrer">
            Abrir PDF de multas TAG vigentes
          </a>
        </p>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Correo enviado correctamente" }),
    };
  } catch (error) {
    console.error("Error real en Resend:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || "Error al enviar correo",
      }),
    };
  }
}
import { useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "./supabaseClient";
import "./App.css";

function App() {
  const [enviando, setEnviando] = useState(false);

  const limpiarRut = (rut) =>
    rut.replace(/\./g, "").replace(/-/g, "").toUpperCase().trim();

  const validarRutChileno = (rut) => {
    const rutLimpio = limpiarRut(rut);
    if (!/^\d{7,8}[0-9K]$/.test(rutLimpio)) return false;

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);

    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i], 10) * multiplo;
      multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvFinal =
      dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : String(dvEsperado);

    return dv === dvFinal;
  };

  const validarEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validarTelefonoChile = (telefono) => {
    const tel = telefono.replace(/\s/g, "");
    return /^(\+?56)?9\d{8}$/.test(tel);
  };

  const validarPatenteChile = (patente) => {
    const p = patente.replace(/[-.\s]/g, "").toUpperCase();
    return /^[A-Z]{4}\d{2}$|^[A-Z]{2}\d{4}$/.test(p);
  };

  const subirArchivoSupabase = async (archivo, tipoDocumento, rut, patente) => {
    const extension = archivo.name.split(".").pop().toLowerCase();

    const nombreArchivo = `${Date.now()}_${tipoDocumento}_${rut}_${patente}.${extension}`
      .replace(/\s/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "");

    const rutaArchivo = `${patente}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("documentos-tag")
      .upload(rutaArchivo, archivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf",
      });

    if (error) {
      console.error("Error Supabase:", error);
      throw new Error("Error al subir los documentos PDF.");
    }

    const { data } = supabase.storage
      .from("documentos-tag")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const form = e.target;

      const nombre = form.nombre.value.trim();
      const rut = form.rut.value.trim();
      const email = form.email.value.trim();
      const telefono = form.telefono.value.trim();
      const patente = form.patente.value.trim().toUpperCase();
      const mensaje = form.mensaje.value.trim();

      const anotaciones = form.anotacionesVigentes.files[0];
      const multasTag = form.multasTag.files[0];

      if (nombre.length < 3) throw new Error("Debes ingresar un nombre válido.");
      if (!validarRutChileno(rut)) throw new Error("El RUT ingresado no es válido.");
      if (!validarEmail(email)) throw new Error("Debes ingresar un correo válido.");
      if (!validarTelefonoChile(telefono)) throw new Error("El teléfono debe ser chileno. Ejemplo: +56912345678.");
      if (!validarPatenteChile(patente)) throw new Error("La patente no es válida. Ejemplo: ABCD12 o AB1234.");
      if (!anotaciones || !multasTag) throw new Error("Debes adjuntar ambos archivos PDF.");
      if (anotaciones.type !== "application/pdf" || multasTag.type !== "application/pdf") throw new Error("Solo se permiten archivos PDF.");
      if (mensaje.length < 10) throw new Error("El detalle debe tener al menos 10 caracteres.");

      const urlAnotaciones = await subirArchivoSupabase(
        anotaciones,
        "anotaciones",
        limpiarRut(rut),
        patente
      );

      const urlMultas = await subirArchivoSupabase(
        multasTag,
        "multas_tag",
        limpiarRut(rut),
        patente
      );

      const respuesta = await fetch("/.netlify/functions/enviar-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          rut,
          email,
          telefono,
          patente,
          mensaje,
          urlAnotaciones,
          urlMultas,
        }),
      });

      if (!respuesta.ok) throw new Error("No se pudo enviar el correo.");

      await Swal.fire({
        icon: "success",
        title: "Solicitud enviada",
        text: "Recibimos tus datos correctamente. Te contactaremos pronto.",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#1d4ed8",
      });

      form.reset();
    } catch (error) {
      console.error("ERROR REAL:", error);

      await Swal.fire({
        icon: "error",
        title: "No se pudo enviar",
        text: error.message || "Ocurrió un problema al enviar la solicitud.",
        confirmButtonText: "Intentar nuevamente",
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <nav className="navbar">
          <div className="brand">
            <span>🚘</span> RevisaTAG
          </div>
          <a href="#contacto" className="navButton">Cotizar revisión</a>
        </nav>

        <section className="heroContent">
          <div>
            <span className="badge">Revisión rápida de multas TAG</span>
            <h1>¿Tienes multas TAG y no sabes por dónde empezar?</h1>
            <p>
              Sube tus documentos, completa tus datos y recibe orientación clara
              para entender tu situación, revisar cobros y saber qué pasos seguir.
            </p>

            <div className="heroActions">
              <a href="#contacto" className="primaryButton">Quiero revisar mi caso</a>
              <a href="#como-funciona" className="secondaryButton">Ver cómo funciona</a>
            </div>

            <div className="trustRow">
              <span>✅ Sin crear cuenta</span>
              <span>✅ Atención personalizada</span>
              <span>✅ Documentos por correo</span>
            </div>
          </div>

          <div className="heroCard">
            <div className="cardIcon">📄</div>
            <h3>Revisión con documentos reales</h3>
            <p>
              Adjunta tus anotaciones vigentes y multas TAG actualizadas para
              recibir una orientación más precisa.
            </p>

            <div className="miniList">
              <div>📌 Patente</div>
              <div>📌 RUT</div>
              <div>📌 PDFs obligatorios</div>
              <div>📌 Respuesta por contacto</div>
            </div>
          </div>
        </section>
      </header>

      <main>
        <section className="highlight">
          <div>
            <strong>¿Por qué usar este servicio?</strong>
            <p>
              Muchas personas no entienden de dónde vienen sus cobros TAG, si
              tienen multas vigentes o qué documentos necesitan para revisar su caso.
            </p>
          </div>
          <a href="#contacto">Solicitar revisión ahora</a>
        </section>

        <section id="como-funciona" className="section">
          <span className="sectionBadge">Proceso simple</span>
          <h2>En 3 pasos puedes enviar tu caso</h2>

          <div className="steps">
            <div className="step">
              <span>1</span>
              <h3>Completa tus datos</h3>
              <p>Nombre, RUT, teléfono, correo y patente del vehículo.</p>
            </div>

            <div className="step">
              <span>2</span>
              <h3>Adjunta tus PDFs</h3>
              <p>Anotaciones vigentes y multas TAG con fecha actual.</p>
            </div>

            <div className="step">
              <span>3</span>
              <h3>Recibe orientación</h3>
              <p>Te contactamos para revisar tu caso y explicarte los pasos.</p>
            </div>
          </div>
        </section>

        <section className="benefits">
          <div className="benefitCard">
            <span>⚡</span>
            <h3>Rápido</h3>
            <p>Envías todo desde el formulario sin reuniones ni trámites iniciales.</p>
          </div>

          <div className="benefitCard">
            <span>🔍</span>
            <h3>Claro</h3>
            <p>Revisamos la información para ayudarte a entender tu situación.</p>
          </div>

          <div className="benefitCard">
            <span>📲</span>
            <h3>Simple</h3>
            <p>Solo necesitas tus PDFs, patente y datos de contacto.</p>
          </div>
        </section>

        <section id="contacto" className="contactSection">
          <div className="contactInfo">
            <span className="sectionBadge light">Cotiza tu revisión</span>
            <h2>Solicita orientación para tus multas TAG</h2>
            <p>
              Completa el formulario y adjunta ambos documentos en PDF. Sin esos
              archivos no podremos revisar correctamente tu caso.
            </p>

            <div className="documentBox">
              <h4>Documentos requeridos</h4>
              <p>📄 Anotaciones vigentes actualizadas</p>
              <p>📄 Multas TAG vigentes con fecha actual</p>
            </div>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <div className="formHeader">
              <h3>Formulario de solicitud</h3>
              <p>Todos los campos son obligatorios.</p>
            </div>

            <label>
              Nombre completo
              <input type="text" name="nombre" placeholder="Ej: Daniel Soto" required />
            </label>

            <label>
              RUT
              <input type="text" name="rut" placeholder="Ej: 12345678-9" maxLength="12" required />
            </label>

            <label>
              Correo electrónico
              <input type="email" name="email" placeholder="Ej: correo@gmail.com" required />
            </label>

            <label>
              Teléfono
              <input type="tel" name="telefono" placeholder="Ej: +56912345678" inputMode="numeric" required />
            </label>

            <label>
              Patente del vehículo
              <input type="text" name="patente" placeholder="Ej: ABCD12" maxLength="6" required />
            </label>

            <label>
              Anotaciones vigentes en PDF
              <input type="file" name="anotacionesVigentes" accept="application/pdf" required />
              <small>Adjunta el certificado de anotaciones vigentes actualizado.</small>
            </label>

            <label>
              Multas TAG vigentes en PDF
              <input type="file" name="multasTag" accept="application/pdf" required />
              <small>Adjunta el documento de multas TAG vigentes con fecha actual.</small>
            </label>

            <label>
              Detalle de la consulta
              <textarea
                name="mensaje"
                placeholder="Cuéntanos qué multa, cobro o problema necesitas revisar"
                rows="5"
                required
              ></textarea>
            </label>

            <button type="submit" disabled={enviando}>
              {enviando ? "Enviando solicitud..." : "Enviar solicitud y cotizar revisión"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
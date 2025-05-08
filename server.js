const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Servir archivos estáticos

// Configuración de multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
});

// Ruta para manejar el formulario
app.post(
  "/api/enviar",
  upload.fields([
    { name: "imagenCedulaFrente", maxCount: 1 },
    { name: "imagenCedulaReverso", maxCount: 1 },
    { name: "imagenTatuaje", maxCount: 1 },
  ]),
  async (req, res) => {
    const data = req.body;
    const files = req.files;

    try {
      // Crear PDF con los datos
      const doc = new PDFDocument();
      const pdfPath = `uploads/${Date.now()}_datos.pdf`;
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      doc
        .fontSize(16)
        .text("Formulario de Registro", { align: "center" })
        .moveDown();
      doc.fontSize(12);
      doc.text(`Cédula: ${data.cedula}`);
      doc.text(`Nombre Completo: ${data.nombre}`);
      doc.text(`Correo Gmail: ${data.correo}`);
      doc.text(`Teléfono: ${data.telefono}`);
      doc.text(`Edad: ${data.edad}`);
      doc.text(`¿Tiene tatuajes?: ${data.tattoo}`);
      doc.text(`Declaración de datos: ${data.declaracion ? "Sí" : "No"}`);
      doc.end();

      await new Promise((resolve) => writeStream.on("finish", resolve));

      // Configurar transporte de correo
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_FROM,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Adjuntar archivos
      const attachments = [{ filename: "datos.pdf", path: pdfPath }];

      if (files.imagenCedulaFrente) {
        attachments.push({
          filename: files.imagenCedulaFrente[0].originalname,
          path: files.imagenCedulaFrente[0].path,
        });
      }

      if (files.imagenCedulaReverso) {
        attachments.push({
          filename: files.imagenCedulaReverso[0].originalname,
          path: files.imagenCedulaReverso[0].path,
        });
      }

      if (files.imagenTatuaje) {
        attachments.push({
          filename: files.imagenTatuaje[0].originalname,
          path: files.imagenTatuaje[0].path,
        });
      }

      // Enviar correo
      await transporter.sendMail({
        from: `"Formulario Web" <${process.env.EMAIL_FROM}>`,
        to: "incorporacionbaspcn@gmail.com",
        subject: "Nuevo formulario recibido",
        text: "Adjunto PDF e imágenes enviadas desde el formulario.",
        attachments,
      });

      // Eliminar archivos temporales
      fs.unlinkSync(pdfPath);
      if (files.imagenCedulaFrente)
        fs.unlinkSync(files.imagenCedulaFrente[0].path);
      if (files.imagenCedulaReverso)
        fs.unlinkSync(files.imagenCedulaReverso[0].path);
      if (files.imagenTatuaje) fs.unlinkSync(files.imagenTatuaje[0].path);

      res.status(200).json({ mensaje: "Enviado correctamente" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al enviar el formulario" });
    }
  },
);

// Ruta raíz para servir index.html directamente
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

let database;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const initializeDBandServer = async () => {
  try {
    database = await open({
      filename: path.join(__dirname, "babySteps.db"),
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running at http://localhost:3001");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

//Get Doctors
app.get("/doctors", async (request, response) => {
  const getDoctorsQuery = `
    SELECT
      *
    FROM
      doctor;`;
  const doctorsArray = await database.all(getDoctorsQuery);
  response.send(doctorsArray);
});

//Get All Appointments
app.get("/appointments", async (req, res) => {
  const getAppointmentsQuery = `
    SELECT
      appointment.id as id,
      doctor.id as doctor_id,
      doctor.name as doctor_name,
      appointment.patient_name as patient_name,
      appointment.appointment_type as appointment_type,
      appointment.date as date,
      appointment.slot as slot,
      appointment.notes as notes,
      doctor.specialization as specialization
    FROM
      appointment inner join doctor on appointment.doctor_id = doctor.id;`;
  const appointmentsArray = await database.all(getAppointmentsQuery);
  res.send(appointmentsArray);
});

//Create Appointment
app.post("/appointments", async (req, res) => {
  const {
    name,
    appointment_type = "Regular",
    notes = "",
    date,
    slot,
    doctorId,
  } = req.body;

  const getAppointmentQuery = `SELECT * FROM appointment WHERE doctor_id = ${doctorId} AND date = '${date}' AND slot LIKE '%${slot}%'`;
  const appointment = await database.all(getAppointmentQuery);
  const isSlotAvailable = appointment.length === 0;

  if (!isSlotAvailable) {
    res.status(400);
    res.send("Slot not available");
  } else {
    const insertQuery = `INSERT INTO appointment (doctor_id, date, patient_name, appointment_type, slot, notes) VALUES (${doctorId}, '${date}', '${name}', '${appointment_type}', '${slot}', '${notes}')`;
    await database.run(insertQuery);
    res.status(201);
    res.send("Appointment created");
  }
});

//Get slots for a doctor on a specific date
app.get("/doctors/:id/slots", async (req, res) => {
  const doctorId = req.params.id;
  const { date, slot } = req.query; // Format: YYYY-MM-DD
  const checkSlotQuery = `SELECT * FROM appointment WHERE doctor_id = ${doctorId} AND date = '${date}' AND slot LIKE '%${slot}%'`;
  const slotExists = await database.all(checkSlotQuery);
  const isAvailable = slotExists.length === 0;
  res.status(200);
  res.send(isAvailable);
});

//GET SPECIFIC APPOINTMENT
app.get("/appointments/:id", async (req, res) => {
  const { id } = req.params;
  const getAppointmentQuery = `SELECT * FROM appointment WHERE id = ${id}`;
  const appointment = await database.get(getAppointmentQuery);
  res.status(200);
  res.send(appointment);
});

//Update Appointment
app.put("/appointments/:id", async (req, res) => {
  const appointmentId = req.params.id;
  const { name, appointment_type, notes, date, slot, doctor_id } = req.body;
  const getAppointmentQuery = `SELECT * FROM appointment WHERE id = ${appointmentId}`;
  const appointment = await database.get(getAppointmentQuery);

  const oldSlot = appointment.slot;
  const oldDate = appointment.date;

  if (oldSlot === slot && oldDate === date) {
    const updateQuery = `UPDATE appointment SET doctor_id = ${doctor_id}, date = '${date}', slot = '${slot}', appointment_type = '${appointment_type}', patient_name = '${name}', notes = '${notes}' WHERE id = ${req.params.id}`;
    await database.run(updateQuery);
    res.status(200);
    res.send("Appointment Updated");
  } else {
    

    const checkSlotQuery = `SELECT * FROM appointment WHERE doctor_id = ${doctor_id} AND date = '${date}' AND slot LIKE '%${slot}%'`;
    const slotExists = await database.all(checkSlotQuery);
    const isAvailable = slotExists.length === 0;

    if (!isAvailable) {
      res.status(400);
      res.send("Time slot is not available");
    } else {
      const updateQuery = `UPDATE appointment SET doctor_id = ${doctor_id}, date = '${date}', slot = '${slot}', appointment_type = '${appointment_type}', patient_name = '${name}', notes = '${notes}' WHERE id = ${appointmentId}`;
      await database.run(updateQuery);
      res.status(200);
      res.send("Appointment Updated");
    }
  }
});

//Delete Appointment
app.delete("/appointments/:id", async (req, res) => {
  const { id } = req.params;
  const deleteAppointmentQuery = `
    DELETE FROM
      appointment
    WHERE
      id = ${id};`;
  await database.run(deleteAppointmentQuery);
  res.status(200);
  res.send("Appointment Removed");
});
